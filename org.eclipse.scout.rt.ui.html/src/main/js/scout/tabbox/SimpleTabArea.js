/*******************************************************************************
 * Copyright (c) 2014-2018 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
scout.SimpleTabArea = function() {
  scout.SimpleTabArea.parent.call(this);
  this.tabs = [];
  this._selectedViewTab = null;
  this._tabClickHandler = this._onTabClick.bind(this);
};
scout.inherits(scout.SimpleTabArea, scout.Widget);

scout.SimpleTabArea.prototype._render = function() {
  this.$container = this.$parent.appendDiv('simple-tab-area');
  this.htmlComp = scout.HtmlComponent.install(this.$container, this.session);
  this.htmlComp.setLayout(new scout.SimpleTabAreaLayout(this));
};

scout.SimpleTabArea.prototype._renderProperties = function() {
  scout.SimpleTabArea.parent.prototype._renderProperties.call(this);
  this._renderTabs();
};

scout.SimpleTabArea.prototype._renderTabs = function() {
  // reverse since tab.renderAfter() called without sibling=true argument (see _renderTab)
  // will _prepend_ themselves into the container.
  this.tabs.slice().reverse()
    .forEach(function(tab) {
      this._renderTab(tab);
    }.bind(this));
};

scout.SimpleTabArea.prototype._renderTab = function(tab) {
  tab.renderAfter(this.$container);
  this._updateVisibility();
};

scout.SimpleTabArea.prototype._updateVisibility = function() {
  if (!this.$container) {
    return;
  }
  this.$container.setVisible(this.isVisible() && this.tabs.length > 0);
  this.invalidateParentLogicalGrid();
};

scout.SimpleTabArea.prototype._renderVisible = function() {
  this._updateVisibility();
};

scout.SimpleTabArea.prototype._attach = function() {
  this.$parent.prepend(this.$container);
  this.session.detachHelper.afterAttach(this.$container);
  // If the parent was resized while this view was detached, the view has a wrong size.
  this.invalidateLayoutTree(false);
  scout.SimpleTabArea.parent.prototype._attach.call(this);
};

/**
 * @override Widget.js
 */
scout.SimpleTabArea.prototype._detach = function() {
  this.session.detachHelper.beforeDetach(this.$container);
  this.$container.detach();
  scout.SimpleTabArea.parent.prototype._detach.call(this);
  this.invalidateLayoutTree(false);
};

scout.SimpleTabArea.prototype._onTabClick = function(event) {
  this.selectTab(event.source);
};

scout.SimpleTabArea.prototype.getTabs = function() {
  return this.tabs;
};

scout.SimpleTabArea.prototype.selectTab = function(viewTab) {
  if (this._selectedViewTab === viewTab) {
    return;
  }
  this.deselectTab(this._selectedViewTab);
  this._selectedViewTab = viewTab;
  if (viewTab) {
    // Select the new view tab.
    viewTab.select();
  }
  this.trigger('tabSelect', {
    viewTab: viewTab
  });
  if (viewTab && viewTab.rendered && !viewTab.$container.isVisible()) {
    this.invalidateLayoutTree();
  }
};

scout.SimpleTabArea.prototype.deselectTab = function(viewTab) {
  if (!viewTab) {
    return;
  }
  if (this._selectedViewTab !== viewTab) {
    return;
  }
  this._selectedViewTab.deselect();
};

scout.SimpleTabArea.prototype.getSelectedTab = function() {
  return this._selectedViewTab;
};

scout.SimpleTabArea.prototype.addTab = function(tab, sibling) {
  var insertPosition = -1;
  if (sibling) {
    insertPosition = this.tabs.indexOf(sibling);
  }
  this.tabs.splice(insertPosition + 1, 0, tab);
  tab.on('click', this._tabClickHandler);
  if (this.rendered) {
    this._renderVisible();
    tab.renderAfter(this.$container, sibling);
    this.invalidateLayoutTree();
  }
};

scout.SimpleTabArea.prototype.destroyTab = function(tab) {
  var index = this.tabs.indexOf(tab);
  if (index > -1) {
    this.tabs.splice(index, 1);
    tab.destroy();
    tab.off('click', this._tabClickHandler);
    this._renderVisible();
    this.invalidateLayoutTree();
  }
};
