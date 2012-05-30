/*******************************************************************************
 * Copyright (c) 2010 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
package org.eclipse.scout.rt.ui.rap.mobile.action;

import java.util.LinkedList;
import java.util.List;

import org.eclipse.rwt.lifecycle.WidgetUtil;
import org.eclipse.scout.commons.beans.IPropertyObserver;
import org.eclipse.scout.rt.client.ui.action.menu.IMenu;
import org.eclipse.scout.rt.ui.rap.basic.RwtScoutComposite;
import org.eclipse.scout.rt.ui.rap.mobile.MobileScoutFormToolkit;
import org.eclipse.scout.rt.ui.rap.util.RwtLayoutUtility;
import org.eclipse.scout.rt.ui.rap.util.ScoutFormToolkit;
import org.eclipse.scout.rt.ui.rap.window.desktop.IRwtScoutActionBar;
import org.eclipse.swt.SWT;
import org.eclipse.swt.custom.CLabel;
import org.eclipse.swt.layout.FillLayout;
import org.eclipse.swt.layout.GridData;
import org.eclipse.swt.layout.GridLayout;
import org.eclipse.swt.widgets.Composite;

/**
 * @since 3.8.0
 */
public abstract class AbstractRwtScoutActionBar<T extends IPropertyObserver> extends RwtScoutComposite<T> implements IRwtScoutActionBar<T> {
  private static final String VARIANT_ACTION_BAR_CONTAINER = "actionBarContainer";

  private Composite m_leftContainer;
  private ActionButtonBar m_leftButtonBar;
  private Composite m_centerContainer;
  private Composite m_rightContainer;
  private ActionButtonBar m_rightButtonBar;

  private boolean m_alwaysVisible = false;
  private Integer m_heightHint;
  private int m_menuOpeningDirection = SWT.DOWN;
  private CLabel m_titleField;

  @Override
  protected void initializeUi(Composite parent) {
    Composite container = getUiEnvironment().getFormToolkit().createComposite(parent);
    container.setData(WidgetUtil.CUSTOM_VARIANT, getActionBarContainerVariant());
    setUiContainer(container);

    createContent();
  }

  protected void createContent() {
    m_leftContainer = createLeftContainer(getUiContainer());
    m_centerContainer = createCenterContainer(getUiContainer());
    m_rightContainer = createRightContainer(getUiContainer());

    initLayout(getUiContainer());
    computeContainerVisibility();
  }

  private void computeContainerVisibility() {
    if (m_leftContainer == null || m_centerContainer == null || m_rightContainer == null) {
      getUiContainer().setVisible(false);
      return;
    }

    boolean makeInvisible = !isAlwaysVisible() && !hasContentOnLeftContainer() && !hasContentOnCenterContainer() && !hasContentOnRightContainer();
    getUiContainer().setVisible(!makeInvisible);
  }

  protected void initLayout(Composite container) {
    GridLayout containerLayout = RwtLayoutUtility.createGridLayoutNoSpacing(3, false);
    container.setLayout(containerLayout);

    {
      GridData gridData = new GridData(SWT.FILL, SWT.CENTER, true, true);
      m_leftContainer.setLayoutData(gridData);
    }

    {
      GridData gridData = new GridData(SWT.FILL, SWT.CENTER, true, true);
      m_centerContainer.setLayoutData(gridData);
      excludeCenterContainerIfNoTitleSet();
    }

    {
      GridData gridData = new GridData(SWT.FILL, SWT.CENTER, true, true);
      m_rightContainer.setLayoutData(gridData);
    }
  }

  protected String getActionBarContainerVariant() {
    return VARIANT_ACTION_BAR_CONTAINER;
  }

  protected Composite createLeftContainer(Composite parent) {
    m_leftButtonBar = createLeftActionButtonBar(parent, m_leftButtonBar);

    return m_leftButtonBar;
  }

  protected boolean hasContentOnLeftContainer() {
    if (m_leftButtonBar == null) {
      return false;
    }

    return m_leftButtonBar.hasButtons();
  }

  protected ActionButtonBar createLeftActionButtonBar(Composite parent, ActionButtonBar existingButtonBar) {
    List<IMenu> menuList = new LinkedList<IMenu>();
    collectMenusForLeftButtonBar(menuList);

    ActionButtonBar leftButtonBar = createActionButtonBar(parent, existingButtonBar, menuList, SWT.LEFT | getMenuOpeningDirection());
    adaptLeftButtonBar(leftButtonBar);

    return leftButtonBar;
  }

  protected void adaptLeftButtonBar(ActionButtonBar buttonBar) {
    // Left bar should always display a regular button.
    // Otherwise it could happen that there is only a "..." button on the left side and at the same time some regular buttons on the right side.
    buttonBar.setMinNumberOfAlwaysVisibleButtons(1);
  }

  protected Composite createCenterContainer(Composite parent) {
    return createCenterTitleBar(parent, m_centerContainer);
  }

  protected boolean hasContentOnCenterContainer() {
    return getTitle() != null;
  }

  protected Composite createCenterTitleBar(Composite parent, Composite existingTitleBar) {
    Composite centerTitleBar = createTitleBar(parent, existingTitleBar);
    adaptCenterTitleBar(centerTitleBar);

    return centerTitleBar;
  }

  protected void adaptCenterTitleBar(Composite buttonBar) {
  }

  protected Composite createRightContainer(Composite parent) {
    m_rightButtonBar = createRightActionButtonBar(parent, m_rightButtonBar);

    return m_rightButtonBar;
  }

  protected ActionButtonBar createRightActionButtonBar(Composite parent, ActionButtonBar existingButtonBar) {
    List<IMenu> menuList = new LinkedList<IMenu>();
    collectMenusForRightButtonBar(menuList);

    ActionButtonBar rightButtonBar = createActionButtonBar(parent, existingButtonBar, menuList, SWT.RIGHT | getMenuOpeningDirection());
    adaptRightButtonBar(rightButtonBar);

    return rightButtonBar;
  }

  protected boolean hasContentOnRightContainer() {
    if (m_rightButtonBar == null) {
      return false;
    }

    return m_rightButtonBar.hasButtons();
  }

  protected void adaptRightButtonBar(ActionButtonBar buttonBar) {
  }

  private Composite createTitleBar(Composite parent, Composite existingTitleBar) {
    if (existingTitleBar != null) {
      existingTitleBar.dispose();
      existingTitleBar = null;
    }

    return createTitleBar(parent);
  }

  protected Composite createTitleBar(Composite parent) {
    Composite container = getUiEnvironment().getFormToolkit().createComposite(parent);
    container.setData(WidgetUtil.CUSTOM_VARIANT, getActionBarContainerVariant());
    container.setLayout(new FillLayout());

    m_titleField = getUiEnvironment().getFormToolkit().createCLabel(container, null, SWT.CENTER);
    //FIXME CGU ClabelEx does not automatically expand if screen gets bigger
    m_titleField.setData(WidgetUtil.CUSTOM_VARIANT, getActionBarContainerVariant());

    return container;
  }

  private ActionButtonBar createActionButtonBar(Composite parent, ActionButtonBar existingButtonBar, List<IMenu> menuList, int style) {
    if (existingButtonBar != null) {
      existingButtonBar.dispose();
      existingButtonBar = null;
    }

    return createActionButtonBar(parent, menuList, style);
  }

  protected ActionButtonBar createActionButtonBar(Composite parent, List<IMenu> menus, int style) {
    ScoutFormToolkit formToolkit = getUiEnvironment().getFormToolkit();
    //TODO check for MobileScoutFormToolkit can be removed as soon as ActionButtonBar is moved to core plugin
    if (formToolkit instanceof MobileScoutFormToolkit) {
      IMenu[] menuArray = menus.toArray(new IMenu[menus.size()]);
      return ((MobileScoutFormToolkit) formToolkit).createActionButtonBar(parent, menuArray, style);
    }

    return null;
  }

  public void rebuildRightButtonBarFromScout() {
    if (isUiDisposed()) {
      return;
    }
    Runnable job = new Runnable() {
      @Override
      public void run() {
        if (isUiDisposed()) {
          return;
        }

        m_rightContainer = createRightContainer(getUiContainer());
        initLayout(getUiContainer());
        computeContainerVisibility();

        getUiContainer().getParent().layout(true, true);
      }
    };
    getUiEnvironment().invokeUiLater(job);
  }

  public void rebuildContentFromScout() {
    if (isUiDisposed()) {
      return;
    }
    Runnable job = new Runnable() {
      @Override
      public void run() {
        if (isUiDisposed()) {
          return;
        }

        createContent();

        getUiContainer().getParent().layout(true, true);
      }
    };
    getUiEnvironment().invokeUiLater(job);
  }

  protected void setTitle(String title) {
    if (title == null) {
      return;
    }

    if (getTitleField() != null) {
      getTitleField().setText(title);
    }

    excludeCenterContainerIfNoTitleSet();
  }

  protected void excludeCenterContainerIfNoTitleSet() {
    boolean hasTitle = getTitle() != null;

    ((GridData) m_centerContainer.getLayoutData()).exclude = !hasTitle;
  }

  public String getTitle() {
    if (getTitleField() == null) {
      return null;
    }

    return getTitleField().getText();
  }

  public boolean isAlwaysVisible() {
    return m_alwaysVisible;
  }

  public void setAlwaysVisible(boolean alwaysVisible) {
    m_alwaysVisible = alwaysVisible;
  }

  @Override
  public Integer getHeightHint() {
    return m_heightHint;
  }

  @Override
  public void setHeightHint(Integer heightHint) {
    m_heightHint = heightHint;
  }

  public int getMenuOpeningDirection() {
    return m_menuOpeningDirection;
  }

  public void setMenuOpeningDirection(int menuOpeningDirection) {
    m_menuOpeningDirection = menuOpeningDirection;
  }

  public CLabel getTitleField() {
    return m_titleField;
  }

  protected void collectMenusForLeftButtonBar(List<IMenu> menuList) {

  }

  protected void collectMenusForRightButtonBar(List<IMenu> menuList) {

  }
}
