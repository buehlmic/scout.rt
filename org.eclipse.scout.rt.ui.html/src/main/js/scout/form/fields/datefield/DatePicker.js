scout.DatePicker = function(dateFormat, dateField) {
  this._dateFormat = dateFormat;
  this._dateField = dateField;
  this.selectedDate = null;
  this.viewDate = null;
  this.$popup = null;
  this.$currentBox = null;
  this.$scrollable = null;
  this._scrollableLeft;
};

scout.DatePicker.prototype.selectDate = function(date, animated) {
  this.show(null, date, animated);
};

scout.DatePicker.prototype.show = function(viewDate, selectedDate, animated) {
  var viewDateDiff = 0;
  var origin = scout.graphics.offsetBounds(this._dateField.$dateField);
  if (!this.$popup) {
    var $parent = $('body'); // TODO BSH Try this: this._dateField.$dateField.closest('.desktop .glasspane') || $('body');
    this.$popup = $.makeDiv('date-box')
      .cssLeft(origin.x)
      .cssTop(origin.y + origin.height)
      .mousedown(this._onMouseDown.bind(this))
      .appendTo($parent);

    this._scrollHandler = this.close.bind(this);
    scout.scrollbars.onScroll(this._dateField.$dateField, this._scrollHandler);

    this._$header = this._createHeader().appendTo(this.$popup);
    this._$header.find('.date-box-left-y, .date-box-left-m, .date-box-right-m, .date-box-right-y').mousedown(this._onNavigationMouseDown.bind(this));

    this.$popup.appendDiv('date-box-separator');
    this.$scrollable = this.$popup.appendDiv('date-box-scrollable');
    this._scrollableTop = this.$scrollable.position().top;
    this._scrollableLeft = this.$scrollable.position().left;
    // Fix the position of the scrollable in order to do proper scrollable shifting (see _appendAnimated)
    this.$scrollable.css({
      'position': 'absolute',
      left: this._scrollableLeft,
      top: this._scrollableTop
    });
  }

  this.selectedDate = selectedDate;

  if (!viewDate) {
    if (selectedDate) {
      viewDate = selectedDate;
    } else {
      viewDate = new Date();
    }
  }
  if (this.viewDate && viewDate) {
    viewDateDiff = scout.dates.compareMonths(viewDate, this.viewDate);
  }
  this.viewDate = viewDate;

  this._updateHeader(viewDate);

  var $box = this._createDateBox();
  $box.find('.date-box-day').click(this._onDayClick.bind(this));
  $box[0].addEventListener('mousewheel', this._onMouseWheel.bind(this), false);

  if (animated && this.$currentBox && viewDateDiff) {
    this._appendAnimated(viewDateDiff, $box);
  } else {
    // Just replace the current month box (new day in the same month has been chosen)
    if (this.$currentBox) {
      this.$currentBox.remove();
    }
    $box.appendTo(this.$scrollable);

    // Measure box size for the animation
    if (!this._boxWidth) {
      this._boxWidth = $box.width();
    }
    if (!this._boxHeight) {
      this._boxHeight = $box.height();
    }
  }
  this.$currentBox = $box;
  $(document).on('mousedown', this._dateField._mouseDownListener);
};

scout.DatePicker.prototype._appendAnimated = function(viewDateDiff, $box) {
  var $currentBox = this.$currentBox;
  var newLeft = 0,
    that = this;
  var monthBoxCount = this.$scrollable.find('.date-box-month').length + 1;
  var scrollableWidth = monthBoxCount * this._boxWidth;

  // Fix the size of the boxes
  $currentBox
    .width(this._boxWidth)
    .height(this._boxHeight);
  $box
    .width(this._boxWidth)
    .height(this._boxHeight);

  this.$scrollable.width(scrollableWidth);
  if (viewDateDiff > 0) {
    // New view date is larger -> shift left
    $box.appendTo(this.$scrollable);
    newLeft = this._scrollableLeft - (scrollableWidth - this._boxWidth);
  } else {
    // New view date is smaller -> shift right
    this.$scrollable.cssLeft(this._scrollableLeft - this._boxWidth);
    $box.prependTo(this.$scrollable);
    newLeft = this._scrollableLeft;
  }

  // Animate
  // At first: stop existing animation when shifting multiple dates in a row (e.g. with mouse wheel)
  this.$scrollable.
  stop(true).
  animate({
    left: newLeft
  }, 300, function() {
    // Remove every month box beside the new one
    // Its important to use that.$currentBox because $box may already be removed
    // if a new day in the current month has been chosen while the animation is in progress (e.g. by holding down key)
    that.$currentBox.siblings('.date-box-month').remove();

    // Reset scrollable settings
    that.$scrollable
      .cssLeft(that._scrollableLeft)
      .width(that._boxWidth);
  });
};

scout.DatePicker.prototype._onNavigationMouseDown = function(event) {
  var $target = $(event.currentTarget);
  var diff = $target.data('shift');
  this.shiftViewDate(0, diff, 0);

  // Don't propagate
  return false;
};

scout.DatePicker.prototype._onDayClick = function(event) {
  var $target = $(event.currentTarget);
  var date = $target.data('date');
  this._dateField.onDateSelected(date);
  this.close(true);

  // Don't propagate
  return false;
};

scout.DatePicker.prototype._onMouseWheel = function(event) {
  event = event || window.event;
  var wheelData = event.wheelDelta ? event.wheelDelta / 10 : -event.detail * 3;
  var diff = (wheelData >= 0 ? -1 : 1);
  this.shiftViewDate(0, diff, 0);

  event.preventDefault();
};

scout.DatePicker.prototype._onMouseDown = function(event) {
  // Make sure field blur won't be triggered (using preventDefault).
  // Also makes sure event does not get propagated (and handled by another mouse down handler, e.g. the one from CellEditorPopup.js)
  return false;
};

scout.DatePicker.prototype.close = function(focusDateField) {
  if (this.$popup) {
    this.$popup.remove();
    this.$popup = null;
    if (focusDateField && this._dateField) {
      this._dateField.$dateField.focus();
    }
  }
  $(document).off('mousedown', this._dateField._mouseDownListener);
  if (this._scrollHandler) {
    scout.scrollbars.offScroll(this._scrollHandler);
    this._scrollHandler = null;
  }
};

scout.DatePicker.prototype.isOpen = function() {
  return !!this.$popup;
};

scout.DatePicker.prototype._onCloseEvent = function() {
  if ($.contains(this.$popup[0], event.target)) {
    return;
  }
  this.close(true);
};

scout.DatePicker.prototype.shiftViewDate = function(years, months, days) {
  var date = this.viewDate;

  date = scout.dates.shift(date, years, months, days);
  this.show(date, null, true);
};

scout.DatePicker.prototype.shiftSelectedDate = function(years, months, days) {
  var date = this.selectedDate;
  if (!date) {
    date = new Date();
  }
  date = scout.dates.shift(date, years, months, days);

  this._dateField.onDateSelected(date);
  this.selectDate(date, true);
};

scout.DatePicker.prototype._createDateBox = function() {
  var cl, i, now = new Date();
  var day, dayInMonth, $day;
  var weekdays = this._dateFormat.symbols.weekdaysShortOrdered;
  var start = new Date(this.viewDate);

  var $box = $.makeDiv('date-box-month').data('viewDate', this.viewDate);

  // Create weekday header
  for (i in weekdays) {
    $box.appendDiv('date-box-weekday', weekdays[i]);
  }

  // Find start date (-1)
  for (var offset = 0; offset < 42; offset++) {
    start.setDate(start.getDate() - 1);
    var diff = new Date(start.getYear(), this.viewDate.getMonth(), 0).getDate() - start.getDate();
    if ((start.getDay() === 0) && (start.getMonth() !== this.viewDate.getMonth()) && (diff > 1)) {
      break;
    }
  }

  // Create days
  for (i = 0; i < 42; i++) {
    start.setDate(start.getDate() + 1);
    dayInMonth = start.getDate();

    if ((start.getDay() === 6) || (start.getDay() === 0)) {
      cl = (start.getMonth() !== this.viewDate.getMonth() ? ' date-box-out-weekend' : ' date-box-weekend');
    } else {
      cl = (start.getMonth() !== this.viewDate.getMonth() ? ' date-box-out' : '');
    }

    if (scout.dates.isSameDay(start, now)) {
      cl += ' date-box-now';
    }

    if (this.selectedDate && scout.dates.isSameDay(start, this.selectedDate)) {
      cl += ' date-box-selected';
    }

    if (dayInMonth > 9 && dayInMonth < 20) {
      cl += ' center-nice';
    }

    day = (dayInMonth <= 9 ? '0' + dayInMonth : dayInMonth);
    $day = $box.
    appendDiv('date-box-day ' + cl, day).
    data('date', new Date(start));
  }

  return $box;
};

scout.DatePicker.prototype._createHeader = function() {
  var headerHtml =
    '<div class="date-box-header">' +
    '  <div class="date-box-left-y" data-shift="-12"></div>' +
    '  <div class="date-box-left-m" data-shift="-1"></div>' +
    '  <div class="date-box-right-y" data-shift="12"></div>' +
    '  <div class="date-box-right-m" data-shift="1"></div>' +
    '  <div class="date-box-header-month"></div>' +
    '</div>';

  return $(headerHtml);
};

scout.DatePicker.prototype._updateHeader = function(viewDate) {
  this._$header.find('.date-box-header-month').text(this._createHeaderText(viewDate));
};

scout.DatePicker.prototype._createHeaderText = function(viewDate) {
  var months = this._dateFormat.symbols.months;
  return months[viewDate.getMonth()] + ' ' + viewDate.getFullYear();
};
