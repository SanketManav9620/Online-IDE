import { useState, useEffect, useCallback } from 'react';
import { WebContainer } from '@webcontainer/api';
import { TemplateFolder } from '@/features/playground/libs/path-to-json';

interface UseWebContainerProps {
  templateData: TemplateFolder;
}

interface UseWebContainerReturn {
  serverUrl: string | null;
  isLoading: boolean;
  error: string | null;
  instance: WebContainer | null;
  writeFileSync: (path: string, content: string) => Promise<void>;
  destroy: () => void; // Added destroy function
}

let webcontainerInstance: WebContainer | null = null;
let webcontainerPromise: Promise<WebContainer> | null = null;

async function getWebContainer(): Promise<WebContainer> {
  if (webcontainerInstance) {
    return webcontainerInstance;
  }
  if (!webcontainerPromise) {
    webcontainerPromise = WebContainer.boot()
      .then((inst) => {
        webcontainerInstance = inst;
        return inst;
      })
      .catch((err) => {
        webcontainerPromise = null;
        throw err;
      });
  }
  return webcontainerPromise;
}

export const useWebContainer = ({ templateData }: UseWebContainerProps): UseWebContainerReturn => {
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!webcontainerInstance);
  const [error, setError] = useState<string | null>(null);
  const [instance, setInstance] = useState<WebContainer | null>(webcontainerInstance);

  useEffect(() => {
    let mounted = true;

    async function initializeWebContainer() {
      try {
        const webcontainerInstance = await getWebContainer();
        
        if (!mounted) return;
        
        setInstance(webcontainerInstance);
        setIsLoading(false);
      } catch (err: any) {
        if (err?.message?.includes("Only a single WebContainer instance can be booted")) {
          if (mounted) setIsLoading(false);
          return;
        }
        console.error('Failed to initialize WebContainer:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize WebContainer');
          setIsLoading(false);
        }
      }
    }

    initializeWebContainer();

    return () => {
      mounted = false;
    };
  }, []);

  const writeFileSync = useCallback(async (path: string, content: string): Promise<void> => {
    let targetInstance = instance || webcontainerInstance;
    if (!targetInstance) {
      try {
        targetInstance = await getWebContainer();
      } catch (e) {
        console.warn('WebContainer instance is not ready yet');
        return;
      }
    }

    if (!targetInstance) {
      console.warn('WebContainer instance is not ready yet');
      return;
    }

    try {
      // Ensure the folder structure exists
      const pathParts = path.split('/');
      const folderPath = pathParts.slice(0, -1).join('/'); // Extract folder path

      if (folderPath) {
        await targetInstance.fs.mkdir(folderPath, { recursive: true }); // Create folder structure recursively
      }

      // Write the file
      await targetInstance.fs.writeFile(path, content);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to write file';
      console.error(`Failed to write file at ${path}:`, err);
    }
  }, [instance]);

  // Added destroy function
  const destroy = useCallback(() => {
    if (instance) {
      instance.teardown();
      setInstance(null);
      setServerUrl(null);
    }
  }, [instance]);

  return { serverUrl, isLoading, error, instance, writeFileSync, destroy };
};