/*
 * Copyright (c) 2010, 2023 BSI Business Systems Integration AG
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package org.eclipse.scout.rt.platform.inventory.internal;

import java.lang.reflect.Modifier;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.eclipse.scout.rt.platform.exception.ProcessingException;
import org.eclipse.scout.rt.platform.inventory.IClassInfo;
import org.eclipse.scout.rt.platform.inventory.IClassInventory;
import org.eclipse.scout.rt.platform.util.Assertions;
import org.eclipse.scout.rt.platform.util.Pair;
import org.jboss.jandex.AnnotationInstance;
import org.jboss.jandex.AnnotationTarget;
import org.jboss.jandex.ClassInfo;
import org.jboss.jandex.CompositeIndex;
import org.jboss.jandex.DotName;
import org.jboss.jandex.IndexView;
import org.jboss.jandex.StackedIndex;

public class JandexClassInventory implements IClassInventory {

  private final IndexView m_index;
  private Map<DotName, ClassLoader> nameToClassLoader = new HashMap<>();
  private List<ClassLoader> m_classLoaders;

  public JandexClassInventory(IndexView baseIndex, List<Pair<IndexView, ClassLoader>> indicesToClassLoader) {
    List<IndexView> indices = new ArrayList<>(indicesToClassLoader.size());
    Set<ClassLoader> classLoaders = new HashSet<>();
    classLoaders.add(ClassLoader.getSystemClassLoader());
    for (Pair<IndexView, ClassLoader> pair : indicesToClassLoader) {
      IndexView index = pair.getLeft();
      ClassLoader classLoader = pair.getRight();
      indices.add(index);
      index.getKnownClasses().forEach(classInfo -> nameToClassLoader.put(classInfo.name(), classLoader));
      classLoaders.add(classLoader);
    }

    baseIndex.getKnownClasses().forEach(classInfo -> nameToClassLoader.put(classInfo.name(), ClassLoader.getSystemClassLoader()));
    indices.add(baseIndex);

    m_index = CompositeIndex.create(indices);
    m_classLoaders = List.copyOf(classLoaders);
  }

  public JandexClassInventory(IndexView index) {
    this(index, Collections.emptyList());
  }

  @Override
  public Set<IClassInfo> getAllKnownSubClasses(Class<?> queryClass) {
    Assertions.assertNotNull(queryClass);
    Collection<ClassInfo> subclasses1;
    Set<ClassInfo> subclasses2;
    if (queryClass.isInterface()) {
      //'getAllKnownImplementors' returns all subclasses but not all subinterfaces. It ignores subinterfaces that have no implementor class at all.
      subclasses1 = m_index.getAllKnownImplementors(DotName.createSimple(queryClass.getName()));
      subclasses2 = new HashSet<>();
      collectAllKnownSubinterfacesRecursive(DotName.createSimple(queryClass.getName()), subclasses2);
    }
    else {
      subclasses1 = m_index.getAllKnownSubclasses(DotName.createSimple(queryClass.getName()));
      subclasses2 = null;
    }
    return convertClassInfos(subclasses1, subclasses2);
  }

  @Override
  public Set<IClassInfo> getAllKnownSubClasses(IClassInfo queryClassInfo) {
    Assertions.assertNotNull(queryClassInfo);
    Collection<ClassInfo> subclasses1;
    Set<ClassInfo> subclasses2;
    if (queryClassInfo.isInterface()) {
      //'getAllKnownImplementors' returns all subclasses but not all subinterfaces. It ignores subinterfaces that have no implementor class at all.
      subclasses1 = m_index.getAllKnownImplementors(DotName.createSimple(queryClassInfo.name()));
      subclasses2 = new HashSet<>();
      collectAllKnownSubinterfacesRecursive(DotName.createSimple(queryClassInfo.name()), subclasses2);
    }
    else {
      subclasses1 = m_index.getAllKnownSubclasses(DotName.createSimple(queryClassInfo.name()));
      subclasses2 = null;
    }
    return convertClassInfos(subclasses1, subclasses2);
  }

  protected void collectAllKnownSubinterfacesRecursive(DotName queryName, Set<ClassInfo> collector) {
    Collection<ClassInfo> subinterfaces = m_index.getKnownDirectImplementors(queryName);
    if (!subinterfaces.isEmpty()) {
      for (ClassInfo ci : subinterfaces) {
        if (Modifier.isInterface(ci.flags()) && collector.add(ci)) {
          collectAllKnownSubinterfacesRecursive(ci.name(), collector);
        }
      }
    }
  }

  @Override
  public Set<IClassInfo> getKnownAnnotatedTypes(Class<?> annotation) {
    Assertions.assertNotNull(annotation);
    Assertions.assertTrue(annotation.isAnnotation(), "given class is not an annotation: {}", annotation);
    Collection<AnnotationInstance> annotationInstances = m_index.getAnnotations(DotName.createSimple(annotation.getName()));
    return convertAnnotationInstance(annotationInstances);
  }

  @Override
  public Set<IClassInfo> getKnownAnnotatedTypes(IClassInfo annotationInfo) {
    Assertions.assertNotNull(annotationInfo);
    Assertions.assertTrue(annotationInfo.isAnnotation(), "given class is not an annotation: {}", annotationInfo.name());
    Collection<AnnotationInstance> annotationInstances = m_index.getAnnotations(DotName.createSimple(annotationInfo.name()));
    return convertAnnotationInstance(annotationInstances);
  }

  @Override
  public List<ClassLoader> getClassLoaders() {
    return m_classLoaders;
  }

  public IClassInfo getClassInfo(String queryClassName) {
    Assertions.assertNotNull(queryClassName);
    ClassInfo ci = m_index.getClassByName(DotName.createSimple(queryClassName));
    if (ci == null) {
      return null;
    }
    return mapClassInfo(ci);
  }

  public IClassInfo getClassInfo(Class<?> queryClass) {
    Assertions.assertNotNull(queryClass);
    ClassInfo ci = m_index.getClassByName(DotName.createSimple(queryClass.getName()));
    if (ci == null) {
      return null;
    }

    return mapClassInfo(ci);
  }

  protected Set<IClassInfo> convertClassInfos(Collection<ClassInfo> classInfos1, Collection<ClassInfo> optionalClassInfos2) {
    Set<IClassInfo> result = new HashSet<>(classInfos1.size() + (optionalClassInfos2 != null ? optionalClassInfos2.size() : 0));
    for (ClassInfo classInfo : classInfos1) {
      result.add(mapClassInfo(classInfo));
    }
    if (optionalClassInfos2 != null) {
      for (ClassInfo classInfo : optionalClassInfos2) {
        result.add(mapClassInfo(classInfo));
      }
    }
    return result;
  }

  protected Set<IClassInfo> convertAnnotationInstance(Collection<AnnotationInstance> annotationInstances) {
    Set<IClassInfo> result = new HashSet<>(annotationInstances.size());
    for (AnnotationInstance annotationInstance : annotationInstances) {
      AnnotationTarget target = annotationInstance.target();
      if (target instanceof ClassInfo classInfo) {
        result.add(mapClassInfo(classInfo));
      }
    }
    return result;
  }

  private IClassInfo mapClassInfo(ClassInfo classInfo) {
    ClassLoader classLoader = nameToClassLoader.get(classInfo.name());
    if (classLoader == null) {
      throw new ProcessingException("Class {} not found", classInfo.name());
    }

    return new JandexClassInfo(classInfo, classLoader);
  }
}
