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
package org.eclipse.scout.rt.server.services.common.processing;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

import org.eclipse.scout.commons.annotations.Priority;
import org.eclipse.scout.commons.filter.AndFilter;
import org.eclipse.scout.commons.filter.IFilter;
import org.eclipse.scout.rt.platform.job.IFuture;
import org.eclipse.scout.rt.platform.job.Jobs;
import org.eclipse.scout.rt.platform.job.filter.JobFutureFilter;
import org.eclipse.scout.rt.server.job.CurrentSessionFutureFilter;
import org.eclipse.scout.rt.server.transaction.internal.ActiveTransactionRegistry;
import org.eclipse.scout.rt.shared.services.common.processing.IServerProcessingCancelService;
import org.eclipse.scout.service.AbstractService;

@Priority(-1)
public class ServerProcessingCancelService extends AbstractService implements IServerProcessingCancelService {

  @Override
  public boolean cancel(final long requestSequence) {
    final Set<Boolean> success = new HashSet<>(2);

    // Cancel the transaction.
    success.add(ActiveTransactionRegistry.cancel(requestSequence));

    // Cancel the job.
    final IFilter<IFuture<?>> jobFilter = new JobFutureFilter(String.valueOf(requestSequence));
    final IFilter<IFuture<?>> sessionFilter = CurrentSessionFutureFilter.INSTANCE;
    success.add(Jobs.getJobManager().cancel(new AndFilter<>(jobFilter, sessionFilter), true));

    return Collections.singleton(Boolean.TRUE).equals(success);
  }
}
