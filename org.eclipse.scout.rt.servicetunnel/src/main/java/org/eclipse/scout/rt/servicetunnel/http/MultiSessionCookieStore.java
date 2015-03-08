package org.eclipse.scout.rt.servicetunnel.http;

import java.net.CookieManager;
import java.net.CookieStore;
import java.net.HttpCookie;
import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.WeakHashMap;
import java.util.concurrent.locks.ReadWriteLock;
import java.util.concurrent.locks.ReentrantReadWriteLock;

import org.eclipse.scout.rt.shared.ISession;

/**
 * HTTP cookie store implementation that manages different sets of cookies ("cookie jars"), one per {@link ISession}.
 */
public class MultiSessionCookieStore implements CookieStore {

  private final ReadWriteLock m_cookieStoresLock = new ReentrantReadWriteLock();
  /**
   * Access to this map synchronized with the ReadWriteLock {@link #m_cookieStoresLock}.
   */
  private final Map<ISession, CookieStore> m_cookieStores;
  private final CookieStore m_defaultCookieStore;

  public MultiSessionCookieStore() {
    // Use a WeakHashMap to ensure that client sessions are not retained when no longer needed.
    m_cookieStores = new WeakHashMap<ISession, CookieStore>();
    m_defaultCookieStore = createInMemoryCookieStore();
  }

  private CookieStore createInMemoryCookieStore() {
    // Because java.net.InMemoryCookieStore is package private, this is the only way to create a new instance.
    return new CookieManager().getCookieStore();
  }

  @Override
  public void add(URI uri, HttpCookie cookie) {
    getDelegate().add(uri, cookie);
  }

  @Override
  public List<HttpCookie> get(URI uri) {
    return getDelegate().get(uri);
  }

  @Override
  public List<HttpCookie> getCookies() {
    return getDelegate().getCookies();
  }

  @Override
  public List<URI> getURIs() {
    return getDelegate().getURIs();
  }

  @Override
  public boolean remove(URI uri, HttpCookie cookie) {
    return getDelegate().remove(uri, cookie);
  }

  @Override
  public boolean removeAll() {
    return getDelegate().removeAll();
  }

  private CookieStore getDelegate() {
    ISession currentSession = ISession.CURRENT.get();
    if (currentSession == null) {
      return m_defaultCookieStore;
    }

    // Check cache with read lock first.
    m_cookieStoresLock.readLock().lock();
    try {
      CookieStore cookieStore = m_cookieStores.get(currentSession);
      if (cookieStore != null) {
        return cookieStore;
      }
    }
    finally {
      m_cookieStoresLock.readLock().unlock();
    }
    // No entry found - get write lock to create it
    m_cookieStoresLock.writeLock().lock();
    try {
      // In the meantime, the cookie store might have been created already by another thread - check again.
      CookieStore cookieStore = m_cookieStores.get(currentSession);
      if (cookieStore != null) {
        return cookieStore;
      }
      else {
        cookieStore = createInMemoryCookieStore();
        m_cookieStores.put(currentSession, cookieStore);
        return cookieStore;
      }
    }
    finally {
      m_cookieStoresLock.writeLock().unlock();
    }
  }

  public void sessionStopped(ISession session) {
    m_cookieStoresLock.writeLock().lock();
    try {
      m_cookieStores.remove(session);
    }
    finally {
      m_cookieStoresLock.writeLock().unlock();
    }
  }
}
