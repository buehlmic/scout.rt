/*
 * Copyright (c) 2010, 2023 BSI Business Systems Integration AG
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package org.eclipse.scout.rt.platform.inventory;

import java.lang.reflect.InvocationTargetException;
import java.util.ArrayList;
import java.util.List;

import org.eclipse.scout.rt.platform.exception.PlatformException;
import org.eclipse.scout.rt.platform.inventory.internal.JandexClassInventory;
import org.eclipse.scout.rt.platform.inventory.internal.JandexInventoryBuilder;
import org.eclipse.scout.rt.platform.util.Pair;
import org.eclipse.scout.rt.platform.util.StringUtility;
import org.jboss.jandex.AnnotationInstance;
import org.jboss.jandex.DotName;
import org.jboss.jandex.IndexView;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Singleton with all the classes that were scanned in maven modules that contain /src/main/resources/META-INF/scout.xml
 */
public final class ClassInventory {

  private static final Logger LOG = LoggerFactory.getLogger(ClassInventory.class);
  private static final IClassInventory CLASS_INVENTORY;

  public static IClassInventory get() {
    return CLASS_INVENTORY;
  }

  private ClassInventory() {
  }

  static {
    try {
      IndexView systemClassLoaderIndex = buildSystemClassloaderIndex();
      List<Pair<IndexView, ClassLoader>> classIndices = buildAdditionalClassInventoryIndices(systemClassLoaderIndex);
      CLASS_INVENTORY = new JandexClassInventory(systemClassLoaderIndex, classIndices);
    }
    catch (Exception t) {
      throw new PlatformException("Error while building class inventory", t);
    }
  }

  private static IndexView buildSystemClassloaderIndex() {
    long t0 = System.nanoTime();
    JandexInventoryBuilder systemClassLoaderInventoryBuilder = new JandexInventoryBuilder();
    if (LOG.isInfoEnabled()) {
      LOG.info("Building jandex base class inventory using rebuild strategy {}...", systemClassLoaderInventoryBuilder.getRebuildStrategy());
    }
    systemClassLoaderInventoryBuilder.scanAllModules();
    IndexView index = systemClassLoaderInventoryBuilder.finish();

    long nanos = System.nanoTime() - t0;
    if (LOG.isInfoEnabled()) {
      LOG.info("Finished building jandex base class inventory in {} ms. Total class count: {}", StringUtility.formatNanos(nanos), index.getKnownClasses().size());
    }
    return index;
  }

  private static List<Pair<IndexView, ClassLoader>> buildAdditionalClassInventoryIndices(IndexView systemClassLoaderIndex) {
    long t0 = System.nanoTime();
    List<Pair<IndexView, ClassLoader>> additionalInventories = new ArrayList<>();
    systemClassLoaderIndex.getAnnotations(DotName.createSimple(ClassInventoryProvider.class.getName()));
    for (AnnotationInstance annotation : systemClassLoaderIndex.getAnnotations(DotName.createSimple(ClassInventoryProvider.class.getName()))) {
      Object inventoryProvider;
      try {
        inventoryProvider = Class.forName(annotation.target().asClass().name().toString())
            .getDeclaredConstructor()
            .newInstance();
      }
      catch (NoSuchMethodException e) {
        throw new PlatformException("No suitable constructor found in class " + ClassInventoryProvider.class.getName(), e);
      }
      catch (InvocationTargetException | InstantiationException | IllegalAccessException | ClassNotFoundException e) {
        throw new PlatformException("Couldn't instantiate class " + ClassInventoryProvider.class.getName(), e);
      }

      if (!(inventoryProvider instanceof IClassInventoryProvider)) {
        throw new PlatformException("All classes with annotation {} must implement the interface {}", ClassInventoryProvider.class.getName(), IClassInventoryProvider.class.getName());
      }

      List<Pair<IndexView, ClassLoader>> inventoryIndices = ((IClassInventoryProvider) inventoryProvider).buildInventories();
      additionalInventories.addAll(inventoryIndices);
      long nanos = System.nanoTime() - t0;
      if (LOG.isInfoEnabled()) {
        LOG.info("Finished building additional class inventories in {} ms.", StringUtility.formatNanos(nanos));
      }
    }

    return additionalInventories;
  }
}
