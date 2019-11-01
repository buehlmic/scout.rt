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
import {scout} from '../../index';
import {Form} from '../../index';
import {Lifecycle} from '../../index';
import {ValueField} from '../../index';

export default class FormLifecycle extends Lifecycle {

constructor() {
  super();

  this.emptyMandatoryElementsTextKey = 'FormEmptyMandatoryFieldsMessage';
  this.invalidElementsTextKey = 'FormInvalidFieldsMessage';
  this.saveChangesQuestionTextKey = 'FormSaveChangesQuestion';
}


init(model) {
  scout.assertParameter('widget', model.widget, Form);
  super.init( model);
}

_reset() {
  this.widget.visitFields(function(field) {
    if (field instanceof ValueField) {
      field.resetValue();
    }
  });
}

_invalidElements() {
  var missingFields = [];
  var invalidFields = [];

  this.widget.visitFields(function(field) {
    var result = field.getValidationResult();
    if (result.valid) {
      return;
    }
    // error status has priority over mandatory
    if (!result.validByErrorStatus) {
      invalidFields.push(field);
      return;
    }
    if (!result.validByMandatory) {
      missingFields.push(field);
    }
  });

  return {
    missingElements: missingFields,
    invalidElements: invalidFields
  };
}

_invalidElementText(element) {
  return element.label;
}

_missingElementText(element) {
  return element.label;
}

_validateWidget() {
  return this.widget._validate();
}

markAsSaved() {
  this.widget.visitFields(function(field) {
    field.markAsSaved();
  });
}

/**
 * Visits all form fields and calls the updateRequiresSave() function. If any
 * field has the requiresSave flag set to true, this function returns true,
 * false otherwise.
 *
 * @see (Java) AbstractFormField #checkSaveNeeded, #isSaveNeeded
 */
requiresSave() {
  var requiresSave = false;
  this.widget.visitFields(function(field) {
    field.updateRequiresSave();
    if (field.requiresSave) {
      requiresSave = true;
    }
  });
  return requiresSave;
}
}
