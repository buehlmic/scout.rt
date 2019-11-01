/*
 * Copyright (c) 2014-2018 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 */
import {graphics} from '../index';
import {Device} from '../index';
import {objects} from '../index';
import {HtmlComponent} from '../index';
import * as $ from 'jquery';
import {arrays} from '../index';
import {scout} from '../index';



/**
 * Static function to install a scrollbar on a container.
 * When the client supports pretty native scrollbars, we use them by default.
 * Otherwise we install JS-based scrollbars. In that case the install function
 * creates a new scrollbar.js. For native scrollbars we
 * must set some additional CSS styles.
 *
 * @memberOf scout.scrollbars
 */

let _$scrollables = {};

export function getScrollables(session) {
  // return scrollables for given session
  if (session) {
    return _$scrollables[session] || [];
  }

  // return all scrollables, no matter to which session they belong
  var $scrollables = [];
  objects.values(_$scrollables).forEach(function($scrollablesPerSession) {
    arrays.pushAll($scrollables, $scrollablesPerSession);
  });
  return $scrollables;
}

export function pushScrollable(session, $container) {
  if (_$scrollables[session]) {
    if (_$scrollables[session].indexOf($container) > -1) {
      // already pushed
      return;
    }
    _$scrollables[session].push($container);
  } else {
    _$scrollables[session] = [$container];
  }
  $.log.isTraceEnabled() && $.log.trace('Scrollable added: ' + $container.attr('class') + '. New length: ' + _$scrollables[session].length);
}

export function removeScrollable(session, $container) {
  var initLength = 0;
  if (_$scrollables[session]) {
    initLength = _$scrollables[session].length;
    arrays.$remove(_$scrollables[session], $container);
    $.log.isTraceEnabled() && $.log.trace('Scrollable removed: ' + $container.attr('class') + '. New length: ' + _$scrollables[session].length);
    if (initLength === _$scrollables[session].length) {
      throw new Error('scrollable could not be removed. Potential memory leak. ' + $container.attr('class'));
    }
  } else {
    throw new Error('scrollable could not be removed. Potential memory leak. ' + $container.attr('class'));
  }
}

export function install($container, options) {
  options = _createDefaultScrollToOptions(options);
  options.axis = options.axis || 'both';

  // Don't use native as variable name because it will break minifying (reserved keyword)
  var nativeScrollbars = scout.nvl(options.nativeScrollbars, Device.get().hasPrettyScrollbars());
  var hybridScrollbars = scout.nvl(options.hybridScrollbars, Device.get().canHideScrollbars());
  if (nativeScrollbars) {
    _installNative($container, options);
  } else if (hybridScrollbars) {
    $container.addClass('hybrid-scrollable');
    _installNative($container, options);
    _installJs($container, options);
  } else {
    $container.css('overflow', 'hidden');
    _installJs($container, options);
  }
  var htmlContainer = HtmlComponent.optGet($container);
  if (htmlContainer) {
    htmlContainer.scrollable = true;
  }
  $container.data('scrollable', true);
  var session = options.session || options.parent.session;
  pushScrollable(session, $container);
  return $container;
}

//private
 export function _installNative($container, options) {
  if (Device.get().isIos()) {
    // On ios, container sometimes is not scrollable when installing too early
    // Happens often with nested scrollable containers (e.g. scrollable table inside a form inside a scrollable tree data)
    setTimeout(_installNativeInternal.bind(this, $container, options));
  } else {
    _installNativeInternal($container, options);
  }
}

//private
 export function _installNativeInternal($container, options) {
  $.log.isTraceEnabled() && $.log.trace('use native scrollbars for container ' + graphics.debugOutput($container));
  if (options.axis === 'x') {
    $container
      .css('overflow-x', 'auto')
      .css('overflow-y', 'hidden');
  } else if (options.axis === 'y') {
    $container
      .css('overflow-x', 'hidden')
      .css('overflow-y', 'auto');
  } else {
    $container.css('overflow', 'auto');
  }
  $container.css('-webkit-overflow-scrolling', 'touch');
}

export function isHybridScrolling($scrollable) {
  return $scrollable.hasClass('hybrid-scrollable');
}

export function isNativeScrolling($scrollable) {
  return scout.isOneOf('auto', $scrollable.css('overflow'), $scrollable.css('overflow-x'), $scrollable.css('overflow-y'));
}

export function isJsScrolling($scrollable) {
  return !!$scrollable.data('scrollbars');
}

//private
 export function _installJs($container, options) {
  $.log.isTraceEnabled() && $.log.trace('installing JS-scrollbars for container ' + graphics.debugOutput($container));
  var scrollbars = arrays.ensure($container.data('scrollbars'));
  scrollbars.forEach(function(scrollbar) {
    scrollbar.destroy();
  });
  scrollbars = [];
  var scrollbar;
  if (options.axis === 'both') {
    var scrollOptions = $.extend({}, options);
    scrollOptions.axis = 'y';
    scrollbar = scout.create('Scrollbar', $.extend({}, scrollOptions));
    scrollbars.push(scrollbar);

    scrollOptions.axis = 'x';
    scrollOptions.mouseWheelNeedsShift = true;
    scrollbar = scout.create('Scrollbar', $.extend({}, scrollOptions));
    scrollbars.push(scrollbar);
  } else {
    scrollbar = scout.create('Scrollbar', $.extend({}, options));
    scrollbars.push(scrollbar);
  }
  $container.data('scrollbars', scrollbars);

  scrollbars.forEach(function(scrollbar) {
    scrollbar.render($container);
    scrollbar.update();
  });
}

/**
 * Removes the js scrollbars for the $container, if there are any.<p>
 */
export function uninstall($container, session) {
  if (!$container.data('scrollable')) {
    // was not installed previously -> uninstalling not necessary
    return;
  }

  var scrollbars = $container.data('scrollbars');
  if (scrollbars) {
    scrollbars.forEach(function(scrollbar) {
      scrollbar.destroy();
    });
  }
  removeScrollable(session, $container);
  $container.removeData('scrollable');
  $container.css('overflow', '');
  $container.removeData('scrollbars');

  var htmlContainer = HtmlComponent.optGet($container);
  if (htmlContainer) {
    htmlContainer.scrollable = false;
  }
}

/**
 * Recalculates the scrollbar size and position.
 * @param $scrollable JQuery element that has .data('scrollbars'), when $scrollable is falsy the function returns immediately
 * @param immediate set to true to immediately update the scrollbar, If set to false,
 *        it will be queued in order to prevent unnecessary updates.
 */
export function update($scrollable, immediate) {
  if (!$scrollable || !$scrollable.data('scrollable')) {
    return;
  }
  var scrollbars = $scrollable.data('scrollbars');
  if (!scrollbars) {
    if (Device.get().isIos()) {
      _handleIosPaintBug($scrollable);
    }
    return;
  }
  if (immediate) {
    _update(scrollbars);
    return;
  }
  if ($scrollable.data('scrollbarUpdatePending')) {
    return;
  }
  // Executes the update later to prevent unnecessary updates
  setTimeout(function() {
    _update(scrollbars);
    $scrollable.removeData('scrollbarUpdatePending');
  }.bind(this), 0);
  $scrollable.data('scrollbarUpdatePending', true);
}

//private
 export function _update(scrollbars) {
  // Reset the scrollbars first to make sure they don't extend the scrollSize
  scrollbars.forEach(function(scrollbar) {
    if (scrollbar.rendered) {
      scrollbar.reset();
    }
  });
  scrollbars.forEach(function(scrollbar) {
    if (scrollbar.rendered) {
      scrollbar.update();
    }
  });
}

/**
 * IOS has problems with nested scrollable containers. Sometimes the outer container goes completely white hiding the elements behind.
 * This happens with the following case: Main box is scrollable but there are no scrollbars because content is smaller than container.
 * In the main box there is a tab box with a scrollable table. This table has scrollbars.
 * If the width of the tab box is adjusted (which may happen if the tab item is selected and eventually prefSize called), the main box will go white.
 * <p>
 * This happens only if -webkit-overflow-scrolling is set to touch.
 * To workaround this bug the flag -webkit-overflow-scrolling will be removed if the scrollable component won't display any scrollbars
 */
//private
 export function _handleIosPaintBug($scrollable) {
  if ($scrollable.data('scrollbarUpdatePending')) {
    return;
  }
  setTimeout(function() {
    workaround();
    $scrollable.removeData('scrollbarUpdatePending');
  });
  $scrollable.data('scrollbarUpdatePending', true);

  function workaround() {
    var size = graphics.size($scrollable).subtract(graphics.insets($scrollable, {
      includePadding: false,
      includeBorder: true
    }));
    if ($scrollable[0].scrollHeight === size.height && $scrollable[0].scrollWidth === size.width) {
      $scrollable.css('-webkit-overflow-scrolling', '');
    } else {
      $scrollable.css('-webkit-overflow-scrolling', 'touch');
    }
  }
}

export function reset($scrollable) {
  var scrollbars = $scrollable.data('scrollbars');
  if (!scrollbars) {
    return;
  }
  scrollbars.forEach(function(scrollbar) {
    scrollbar.reset();
  });
}

/**
 * Scrolls the $scrollable to the given $element (must be a child of $scrollable)
 *
 * OPTION                   DEFAULT VALUE   DESCRIPTION
 * ------------------------------------------------------------------------------------------------------
 * align                    undefined       Specifies where the element should be positioned in the view port. Can either be 'top', 'center' or 'bottom'.
 *                                          If unspecified, the following rules apply:
 *                                          - If the element is above the visible area it will be aligned to top.
 *                                          - If the element is below the visible area it will be aligned to bottom.
 *                                          - If the element is already in the visible area no scrolling is done.
 *
 * animate                  false           If true, the scroll position will be animated so that the element moves smoothly to its new position
 * stop                     true            If true, all running animations are stopped before executing the current scroll request.
 *
 * @param {$} $scrollable
 *          the scrollable object
 * @param {$} $element
 *          the element to scroll to
 * @param [options]
 *          an optional options object, see table above. Short-hand version: If a string is passed instead
 *          of an object, the value is automatically converted to the option "align".
 */
export function scrollTo($scrollable, $element, options) {
  var scrollTo,
    scrollOffsetUp = 4,
    scrollOffsetDown = 8,
    scrollableH = $scrollable.height(),
    elementBounds = graphics.offsetBounds($element),
    scrollableBounds = graphics.offsetBounds($scrollable),
    elementTop = elementBounds.y - scrollableBounds.y - scrollOffsetUp, // relative to scrollable y
    elementTopNew = 0,
    elementH = elementBounds.height + scrollOffsetDown,
    elementBottom = elementTop + elementH;

  if (typeof options === 'string') {
    options = {
      align: options
    };
  } else {
    options = _createDefaultScrollToOptions(options);
  }

  var align = options.align;
  if (!align) {
    // If the element is above the visible area it will be aligned to top.
    // If the element is below the visible area it will be aligned to bottom.
    // If the element is already in the visible area no scrolling is done.
    align = (elementTop < 0) ? 'top' : (elementBottom > scrollableH ? 'bottom' : undefined);
  } else {
    align = align.toLowerCase();
  }

  if (align === 'center') {
    // align center
    scrollTo = $scrollable.scrollTop() + elementTop - Math.max(0, (scrollableH - elementH) / 2);

  } else if (align === 'top') {
    // align top
    // Element is on the top of the view port -> scroll up
    scrollTo = $scrollable.scrollTop() + elementTop;

  } else if (align === 'bottom') {
    // align bottom
    // Element is on the Bottom of the view port -> scroll down
    // On IE, a fractional position gets truncated when using scrollTop -> ceil to make sure the full element is visible
    scrollTo = Math.ceil($scrollable.scrollTop() + elementBottom - scrollableH);

    // If the viewport is very small, make sure the element is not moved outside on top
    // Otherwise when calling this function again, since the element is on the top of the view port, the scroll pane would scroll down which results in flickering
    elementTopNew = elementTop - (scrollTo - $scrollable.scrollTop());
    if (elementTopNew < 0) {
      scrollTo = scrollTo + elementTopNew;
    }
  }
  if (scrollTo) {
    scrollTop($scrollable, scrollTo, options);
  }
}

//private
 export function _createDefaultScrollToOptions(options) {
  var defaults = {
    anmiate: false,
    stop: true
  };
  return $.extend({}, defaults, options);
}

/**
 * Horizontally scrolls the $scrollable to the given $element (must be a child of $scrollable)
 */
export function scrollHorizontalTo($scrollable, $element, options) {
  var scrollTo,
    scrollableW = $scrollable.width(),
    elementBounds = graphics.bounds($element, true),
    elementLeft = elementBounds.x,
    elementW = elementBounds.width;

  if (elementLeft < 0) {
    scrollLeft($scrollable, $scrollable.scrollLeft() + elementLeft, options);
  } else if (elementLeft + elementW > scrollableW) {
    // On IE, a fractional position gets truncated when using scrollTop -> ceil to make sure the full element is visible
    scrollTo = Math.ceil($scrollable.scrollLeft() + elementLeft + elementW - scrollableW);
    scrollLeft($scrollable, scrollTo, options);
  }
}

export function scrollTop($scrollable, scrollTop, options) {
  options = _createDefaultScrollToOptions(options);
  var scrollbarElement = scrollbar($scrollable, 'y');
  if (scrollbarElement) {
    scrollbarElement.notifyBeforeScroll();
  }

  // Not animated
  if (!options.animate) {
    if (options.stop) {
      $scrollable.stop('scroll');
    }
    $scrollable.scrollTop(scrollTop);
    if (scrollbarElement) {
      scrollbarElement.notifyAfterScroll();
    }
    return;
  }

  // Animated
  animateScrollTop($scrollable, scrollTop, options);
  $scrollable.promise('scroll').always(function() {
    if (scrollbarElement) {
      scrollbarElement.notifyAfterScroll();
    }
  });
}

export function scrollLeft($scrollable, scrollLeft, options) {
  options = _createDefaultScrollToOptions(options);
  var scrollbarElement = scrollbar($scrollable, 'x');
  if (scrollbarElement) {
    scrollbarElement.notifyBeforeScroll();
  }

  // Not animated
  if (!options.animate) {
    if (options.stop) {
      $scrollable.stop('scroll');
    }
    $scrollable.scrollLeft(scrollLeft);
    if (scrollbarElement) {
      scrollbarElement.notifyAfterScroll();
    }
    return;
  }

  // Animated
  animateScrollLeft($scrollable, scrollLeft, options);
  $scrollable.promise('scroll').always(function() {
    if (scrollbarElement) {
      scrollbarElement.notifyAfterScroll();
    }
  });
}

export function animateScrollTop($scrollable, scrollTop, options) {
  if (options.stop) {
    $scrollable.stop('scroll');
  }
  $scrollable.animate({
      scrollTop: scrollTop
    }, {
      queue: 'scroll'
    })
    .dequeue('scroll');
}

export function animateScrollLeft($scrollable, scrollLeft, options) {
  if (options.stop) {
    $scrollable.stop('scroll');
  }
  $scrollable.animate({
      scrollLeft: scrollLeft
    }, {
      queue: 'scroll'
    })
    .dequeue('scroll');
}

export function scrollbar($scrollable, axis) {
  var scrollbars = $scrollable.data('scrollbars') || [];
  return arrays.find(scrollbars, function(scrollbar) {
    return scrollbar.axis === axis;
  });
}

export function scrollToBottom($scrollable) {
  scrollTop($scrollable, $scrollable[0].scrollHeight - $scrollable[0].offsetHeight);
}

/**
 * Returns true if the location is visible in the current viewport of the $scrollable, or if $scrollable is null
 * @param location object with x and y properties
 *
 */
export function isLocationInView(location, $scrollable) {
  if (!$scrollable || $scrollable.length === 0) {
    return true;
  }
  var scrollableOffsetBounds = graphics.offsetBounds($scrollable);
  return scrollableOffsetBounds.contains(location.x, location.y);
}

/**
 * Attaches the given handler to each scrollable parent, including $anchor if it is scrollable as well.<p>
 * Make sure you remove the handlers when not needed anymore using offScroll.
 */
export function onScroll($anchor, handler) {
  handler.$scrollParents = [];
  $anchor.scrollParents().each(function() {
    var $scrollParent = $(this);
    $scrollParent.on('scroll', handler);
    handler.$scrollParents.push($scrollParent);
  });
}

export function offScroll(handler) {
  var $scrollParents = handler.$scrollParents;
  if (!$scrollParents) {
    throw new Error('$scrollParents are not defined');
  }
  for (var i = 0; i < $scrollParents.length; i++) {
    var $elem = $scrollParents[i];
    $elem.off('scroll', handler);
  }
}

/**
 * Sets the position to fixed and updates left and top position.
 * This is necessary to prevent flickering in IE.
 */
export function fix($elem) {
  if (!$elem.isVisible() || $elem.css('position') === 'fixed') {
    return;
  }

  // getBoundingClientRect used by purpose instead of graphics.offsetBounds to get exact values
  // Also important: offset() of jquery returns getBoundingClientRect().top + window.pageYOffset.
  // In case of IE and zoom = 125%, the pageYOffset is 1 because the height of the navigation is bigger than the height of the desktop which may be fractional.
  var bounds = $elem[0].getBoundingClientRect();
  $elem
    .css('position', 'fixed')
    .cssLeft(bounds.left - $elem.cssMarginLeft())
    .cssTop(bounds.top - $elem.cssMarginTop())
    .cssWidth(bounds.width)
    .cssHeight(bounds.height);
}

/**
 * Reverts the changes made by fix().
 */
export function unfix($elem, timeoutId, immediate) {
  clearTimeout(timeoutId);
  if (immediate) {
    _unfix($elem);
    return;
  }
  return setTimeout(function() {
    _unfix($elem);
  }.bind(this), 50);
}

//private
 export function _unfix($elem) {
  $elem.css({
    position: 'absolute',
    left: '',
    top: '',
    width: '',
    height: ''
  });
}

/**
 * Stores the position of all scrollables that belong to an optional session.
 * @param session (optional) when no session is given, scrollables from all sessions are stored
 */
export function storeScrollPositions($container, session) {
  var $scrollables = getScrollables(session);
  if (!$scrollables) {
    return;
  }

  var scrollTop, scrollLeft;
  $scrollables.forEach(function($scrollable) {
    if ($container.isOrHas($scrollable[0])) {
      scrollTop = $scrollable.scrollTop();
      $scrollable.data('scrollTop', scrollTop);
      scrollLeft = $scrollable.scrollLeft();
      $scrollable.data('scrollLeft', $scrollable.scrollLeft());
      $.log.isTraceEnabled() && $.log.trace('Stored scroll position for ' + $scrollable.attr('class') + '. Top: ' + scrollTop + '. Left: ' + scrollLeft);
    }
  });
}

/**
 * Restores the position of all scrollables that belong to an optional session.
 * @param session (optional) when no session is given, scrollables from all sessions are restored
 */
export function restoreScrollPositions($container, session) {
  var $scrollables = getScrollables(session);
  if (!$scrollables) {
    return;
  }

  var scrollTop, scrollLeft;
  $scrollables.forEach(function($scrollable) {
    if ($container.isOrHas($scrollable[0])) {
      scrollTop = $scrollable.data('scrollTop');
      if (scrollTop) {
        $scrollable.scrollTop(scrollTop);
        $scrollable.removeData('scrollTop');
      }
      scrollLeft = $scrollable.data('scrollLeft');
      if (scrollLeft) {
        $scrollable.scrollLeft(scrollLeft);
        $scrollable.removeData('scrollLeft');
      }
      // Also make sure that scroll bar is up to date
      // Introduced for use case: Open large table page, edit entry, press f5
      // -> outline tab gets rendered, scrollbar gets updated with set timeout, outline tab gets detached
      // -> update event never had any effect because it executed after detaching (due to set timeout)
      update($scrollable);
      $.log.isTraceEnabled() && $.log.trace('Restored scroll position for ' + $scrollable.attr('class') + '. Top: ' + scrollTop + '. Left: ' + scrollLeft);
    }
  });
}

export function setVisible($scrollable, visible) {
  if (!$scrollable || !$scrollable.data('scrollable')) {
    return;
  }
  var scrollbars = $scrollable.data('scrollbars');
  if (!scrollbars) {
    return;
  }
  scrollbars.forEach(function(scrollbar) {
    if (scrollbar.rendered) {
      scrollbar.$container.setVisible(visible);
    }
  });
}

export function opacity($scrollable, opacity) {
  if (!$scrollable || !$scrollable.data('scrollable')) {
    return;
  }
  var scrollbars = $scrollable.data('scrollbars');
  if (!scrollbars) {
    return;
  }
  scrollbars.forEach(function(scrollbar) {
    if (scrollbar.rendered) {
      scrollbar.$container.css('opacity', opacity);
    }
  });
}

//private
 export function _getCompleteChildRowsHeightRecursive(children, getChildren, isExpanded, defaultChildHeight) {
  var height = 0;
  children.forEach(function(child) {
    if (child.height) {
      height += child.height;
    } else {
      // fallback for children with unset height
      height += defaultChildHeight;
    }
    if (isExpanded(child) && getChildren(child).length > 0) {
      height += _getCompleteChildRowsHeightRecursive(getChildren(child), getChildren, isExpanded, defaultChildHeight);
    }
  }.bind(this));
  return height;
}

export function ensureExpansionVisible(parent) {
  var isParentExpanded = parent.isExpanded(parent.element);
  var children = parent.getChildren(parent.element);
  var parentPositionTop = parent.$element.position().top;
  var parentHeight = parent.element.height;
  var scrollTopPos = parent.$scrollable.scrollTop();

  // vertical scrolling
  if (!isParentExpanded) {
    // parent is not expanded, make sure that at least one node above the parent is visible
    if (parentPositionTop < parentHeight) {
      var minScrollTop = Math.max(scrollTopPos - (parentHeight - parentPositionTop), 0);
      scrollTop(parent.$scrollable, minScrollTop, {
        animate: true
      });
    }
  } else if (isParentExpanded && children.length > 0) {
    // parent is expanded and has children, best effort approach to show the expansion
    var fullDataHeight = parent.$scrollable.height();

    // get childRowCount considering already expanded rows
    var childRowsHeight = _getCompleteChildRowsHeightRecursive(children, parent.getChildren, parent.isExpanded, parent.defaultChildHeight);

    // + 1.5 since its the parent's top position and we want to scroll half a row further to show that there's something after the expansion
    var additionalHeight = childRowsHeight + (1.5 * parentHeight);
    var scrollTo = parentPositionTop + additionalHeight;
    // scroll as much as needed to show the expansion but make sure that the parent row (plus one more) is still visible
    var newScrollTop = scrollTopPos + Math.min(scrollTo - fullDataHeight, parentPositionTop - parentHeight);
    // only scroll down
    if (newScrollTop > scrollTopPos) {
      scrollTop(parent.$scrollable, newScrollTop, {
        animate: true,
        stop: false
      });
    }
  }

  if (children.length > 0) {
    // horizontal scrolling: at least 3 levels of hierarchy should be visible (only relevant for small fields)
    var minLevelLeft = Math.max(parent.element.level - 3, 0) * parent.nodePaddingLevel;
    scrollLeft(parent.$scrollable, minLevelLeft, {
      animate: true,
      stop: false
    });
  }
}

export default {
  animateScrollLeft,
  animateScrollTop,
  ensureExpansionVisible,
  fix,
  getScrollables,
  install,
  isHybridScrolling,
  isJsScrolling,
  isLocationInView,
  isNativeScrolling,
  offScroll,
  onScroll,
  opacity,
  pushScrollable,
  removeScrollable,
  reset,
  restoreScrollPositions,
  scrollHorizontalTo,
  scrollLeft,
  scrollTo,
  scrollToBottom,
  scrollTop,
  scrollbar,
  setVisible,
  storeScrollPositions,
  unfix,
  uninstall,
  update
};
