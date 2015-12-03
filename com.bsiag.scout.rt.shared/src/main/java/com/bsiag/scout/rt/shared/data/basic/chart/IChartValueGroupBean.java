/*******************************************************************************
 * Copyright (c) 2015 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
package com.bsiag.scout.rt.shared.data.basic.chart;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.List;

/**
 * @since 5.2
 */
public interface IChartValueGroupBean extends Serializable {

  String getGroupName();

  void setGroupName(String groupName);

  List<BigDecimal> getValues();

  String getColorHexValue();

  void setColorHexValue(String colorHexValue);
}