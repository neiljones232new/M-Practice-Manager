import { useEffect, useCallback, useRef } from 'react';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  interactionTime: number;
}

export const usePerformance = (componentName: string) => {
  const startTime = useRef<number>(Date.now());
  const renderStartTime = useRef<number>(Date.now());

  useEffect(() => {
    // Component mounted
    const loadTime = Date.now() - startTime.current;
    
    // Log performance metrics
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${componentName} loaded in ${loadTime}ms`);
    }

    // Report to performance API if available
    if (typeof window !== 'undefined' && window.performance) {
      window.performance.mark(`${componentName}-loaded`);
    }
  }, [componentName]);

  const measureRender = useCallback(() => {
    const renderTime = Date.now() - renderStartTime.current;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${componentName} rendered in ${renderTime}ms`);
    }

    return renderTime;
  }, [componentName]);

  const measureInteraction = useCallback((actionName: string) => {
    const interactionStart = Date.now();
    
    return () => {
      const interactionTime = Date.now() - interactionStart;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${componentName}.${actionName} took ${interactionTime}ms`);
      }

      // Report to performance API
      if (typeof window !== 'undefined' && window.performance) {
        window.performance.mark(`${componentName}-${actionName}-end`);
        window.performance.measure(
          `${componentName}-${actionName}`,
          `${componentName}-${actionName}-start`,
          `${componentName}-${actionName}-end`
        );
      }

      return interactionTime;
    };
  }, [componentName]);

  const startInteractionMeasure = useCallback((actionName: string) => {
    if (typeof window !== 'undefined' && window.performance) {
      window.performance.mark(`${componentName}-${actionName}-start`);
    }
  }, [componentName]);

  return {
    measureRender,
    measureInteraction,
    startInteractionMeasure,
  };
};

export const useMemoryMonitor = () => {
  const checkMemoryUsage = useCallback(() => {
    if (typeof window !== 'undefined' && (window.performance as any).memory) {
      const memory = (window.performance as any).memory;
      
      return {
        used: Math.round(memory.usedJSHeapSize / 1048576), // MB
        total: Math.round(memory.totalJSHeapSize / 1048576), // MB
        limit: Math.round(memory.jsHeapSizeLimit / 1048576), // MB
      };
    }
    
    return null;
  }, []);

  const logMemoryUsage = useCallback((context: string) => {
    const memory = checkMemoryUsage();
    
    if (memory && process.env.NODE_ENV === 'development') {
      console.log(`[Memory] ${context}: ${memory.used}MB / ${memory.total}MB (limit: ${memory.limit}MB)`);
    }
  }, [checkMemoryUsage]);

  return {
    checkMemoryUsage,
    logMemoryUsage,
  };
};

export const useResourceMonitor = () => {
  const measureResourceLoad = useCallback((resourceType: string, resourceName: string) => {
    if (typeof window === 'undefined' || !window.performance) {
      return null;
    }

    const entries = window.performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const resource = entries.find(entry => entry.name.includes(resourceName));

    if (resource) {
      return {
        name: resource.name,
        type: resourceType,
        duration: resource.duration,
        size: resource.transferSize || 0,
        cached: resource.transferSize === 0 && resource.decodedBodySize > 0,
      };
    }

    return null;
  }, []);

  const getPageLoadMetrics = useCallback(() => {
    if (typeof window === 'undefined' || !window.performance) {
      return null;
    }

    const navigation = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (navigation) {
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: navigation.responseEnd - navigation.requestStart,
        domInteractive: navigation.domInteractive - navigation.fetchStart,
        totalLoadTime: navigation.loadEventEnd - navigation.fetchStart,
      };
    }

    return null;
  }, []);

  return {
    measureResourceLoad,
    getPageLoadMetrics,
  };
};

// Performance observer hook
export const usePerformanceObserver = () => {
  useEffect(() => {
    if (typeof window === 'undefined' || !window.PerformanceObserver) {
      return;
    }

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach((entry) => {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Performance Observer] ${entry.name}: ${entry.duration}ms`);
        }
      });
    });

    observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });

    return () => {
      observer.disconnect();
    };
  }, []);
};