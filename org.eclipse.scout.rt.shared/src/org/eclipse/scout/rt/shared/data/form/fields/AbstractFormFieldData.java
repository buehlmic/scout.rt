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
package org.eclipse.scout.rt.shared.data.form.fields;

import java.io.Serializable;
import java.util.HashMap;
import java.util.Map;

import org.eclipse.scout.commons.ConfigurationUtility;
import org.eclipse.scout.commons.logger.IScoutLogger;
import org.eclipse.scout.commons.logger.ScoutLogManager;
import org.eclipse.scout.rt.shared.data.form.properties.AbstractPropertyData;

public abstract class AbstractFormFieldData implements Serializable {
  private static final IScoutLogger LOG = ScoutLogManager.getLogger(AbstractFormFieldData.class);
  private static final long serialVersionUID = 1L;

  private Map<Class<? extends AbstractPropertyData>, AbstractPropertyData> m_propertyMap;
  private Map<Class<? extends AbstractFormFieldData>, AbstractFormFieldData> m_fieldMap;
  private boolean m_valueSet;

  public AbstractFormFieldData() {
    initConfig();
  }

  private Class<? extends AbstractPropertyData>[] getConfiguredPropertyDatas() {
    Class[] dca = ConfigurationUtility.getDeclaredPublicClasses(getClass());
    return ConfigurationUtility.filterClasses(dca, AbstractPropertyData.class);
  }

  private Class<? extends AbstractFormFieldData>[] getConfiguredFieldDatas() {
    Class[] dca = ConfigurationUtility.getDeclaredPublicClasses(getClass());
    return ConfigurationUtility.filterClasses(dca, AbstractFormFieldData.class);
  }

  protected void initConfig() {
    // add properties
    m_propertyMap = new HashMap<Class<? extends AbstractPropertyData>, AbstractPropertyData>();
    Class<? extends AbstractPropertyData>[] propArray = getConfiguredPropertyDatas();
    for (int i = 0; i < propArray.length; i++) {
      AbstractPropertyData p;
      try {
        p = ConfigurationUtility.newInnerInstance(this, propArray[i]);
        m_propertyMap.put(p.getClass(), p);
      }// end try
      catch (Exception e) {
        LOG.warn(null, e);
      }
    }// end for
     // add fields
    HashMap<Class<? extends AbstractFormFieldData>, AbstractFormFieldData> map = new HashMap<Class<? extends AbstractFormFieldData>, AbstractFormFieldData>();
    Class<? extends AbstractFormFieldData>[] fieldArray = getConfiguredFieldDatas();
    for (int i = 0; i < fieldArray.length; i++) {
      AbstractFormFieldData f;
      try {
        f = ConfigurationUtility.newInnerInstance(this, fieldArray[i]);
        map.put(f.getClass(), f);
      }// end try
      catch (Exception e) {
        LOG.warn(null, e);
      }
    }// end for
    if (map.size() > 0) {
      m_fieldMap = map;
    }
  }

  public Map<String, Object> getValidationRules() {
    HashMap<String, Object> ruleMap = new HashMap<String, Object>();
    initValidationRules(ruleMap);
    return ruleMap;
  }

  protected void initValidationRules(Map<String, Object> ruleMap) {
  }

  public String getFieldId() {
    String s = getClass().getName();
    int i = Math.max(s.lastIndexOf('$'), s.lastIndexOf('.'));
    s = s.substring(i + 1);
    return s;
  }

  public boolean isValueSet() {
    return m_valueSet;
  }

  public void setValueSet(boolean b) {
    m_valueSet = b;
  }

  public AbstractPropertyData getPropertyById(String id) {
    for (AbstractPropertyData p : m_propertyMap.values()) {
      if (p.getPropertyId().equalsIgnoreCase(id)) {
        return p;
      }
    }
    return null;
  }

  @SuppressWarnings("unchecked")
  public <T extends AbstractPropertyData> T getPropertyByClass(Class<T> c) {
    return (T) m_propertyMap.get(c);
  }

  public <T extends AbstractPropertyData> void setPropertyByClass(Class<T> c, T v) {
    if (v == null) {
      m_propertyMap.remove(c);
    }
    else {
      m_propertyMap.put(c, v);
    }
  }

  public AbstractPropertyData[] getAllProperties() {
    return m_propertyMap != null ? m_propertyMap.values().toArray(new AbstractPropertyData[m_propertyMap.size()]) : new AbstractPropertyData[0];
  }

  public AbstractFormFieldData getFieldById(String id) {
    if (m_fieldMap == null) return null;
    for (AbstractFormFieldData f : m_fieldMap.values()) {
      if (f.getFieldId().equals(id)) {
        return f;
      }
    }
    return null;
  }

  @SuppressWarnings("unchecked")
  public <T extends AbstractFormFieldData> T getFieldByClass(Class<T> c) {
    if (m_fieldMap == null) return null;
    return (T) m_fieldMap.get(c);
  }

  public <T extends AbstractFormFieldData> void setFieldByClass(Class<T> c, T v) {
    if (v == null) {
      if (m_fieldMap != null) {
        m_fieldMap.remove(c);
      }
    }
    else {
      if (m_fieldMap == null) {
        m_fieldMap = new HashMap<Class<? extends AbstractFormFieldData>, AbstractFormFieldData>();
      }
      m_fieldMap.put(c, v);
    }
  }

  public AbstractFormFieldData[] getFields() {
    if (m_fieldMap == null) return new AbstractFormFieldData[0];
    return m_fieldMap.values().toArray(new AbstractFormFieldData[m_fieldMap.size()]);
  }

}
