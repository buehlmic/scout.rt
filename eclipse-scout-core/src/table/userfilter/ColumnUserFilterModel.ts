/*
 * Copyright (c) 2010-2022 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 */
import {Column, ColumnUserFilterValues, TableUserFilterModel} from '../../index';

export interface ColumnUserFilterModel extends TableUserFilterModel {
  column?: Column<any> | string;

  /**
   * This property is used to check early whether this filter can produce filter-fields.
   * Set this property to true in your subclass, if it creates filter fields.
   */
  hasFilterFields?: boolean;

  /**
   * array of (normalized) key, text composite
   */
  availableValues?: ColumnUserFilterValues[];

  /**
   * array of (normalized) keys
   */
  selectedValues?: (string | number)[];
}