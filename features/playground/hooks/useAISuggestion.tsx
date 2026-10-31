import { useState, useRef, useCallback } from "react";

interface AISuggestionsState {
  suggestion: string | null;
  isLoading: boolean;
  position: { line: number; column: number } | null;
  decoration: string[];
  isEnabled: boolean;
}

interface UseAISuggestionsReturn extends AISuggestionsState {
  toggleEnabled: () => void;
  fetchSuggestion: (type: string, editor: any) => Promise<void>;
  acceptSuggestion: (editor: any, monaco: any) => void;
  rejectSuggestion: (editor: any) => void;
  clearSuggestion: (editor: any) => void;
}

export const useAISuggestions = (): UseAISuggestionsReturn => {
  const [state, setState] = useState<AISuggestionsState>({
    suggestion: null,
    isLoading: false,
    position: null,
    decoration: [],
    isEnabled: true,
  });

  const isEnabledRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const toggleEnabled = useCallback(() => {
    setState((prev) => {
      const next = !prev.isEnabled;
      isEnabledRef.current = next;
      if (!next && abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      return {
        ...prev,
        isEnabled: next,
        suggestion: next ? prev.suggestion : null,
      };
    });
  }, []);

  const fetchSuggestion = useCallback(async (type: string, editor: any) => {
    if (!isEnabledRef.current || !editor) {
      return;
    }

    const model = editor.getModel();
    const cursorPosition = editor.getPosition();

    if (!model || !cursorPosition) {
      return;
    }

    // Abort previous in-flight request to ensure smooth typing without race conditions
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const payload = {
        fileContent: model.getValue(),
        cursorLine: cursorPosition.lineNumber - 1,
        cursorColumn: cursorPosition.column - 1,
        suggestionType: type,
      };

      const response = await fetch("/api/code-suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }

      const data = await response.json();

      // Check if this request is still the active one
      if (controller.signal.aborted) return;

      const suggestionText = data.suggestion ? data.suggestion.trim() : "";

      // Discard placeholder or unavailable strings
      if (
        suggestionText &&
        !suggestionText.startsWith("// AI suggestion unavailable")
      ) {
        setState((prev) => ({
          ...prev,
          suggestion: suggestionText,
          position: {
            line: cursorPosition.lineNumber,
            column: cursorPosition.column,
          },
          isLoading: false,
        }));
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    } catch (error: any) {
      if (error?.name === "AbortError") {
        // Normal cancellation due to typing continuation
        return;
      }
      console.warn("AI suggestion fetch warning:", error?.message || error);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  const acceptSuggestion = useCallback(
    (editor: any, monaco: any) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      setState((currentState) => {
        if (!currentState.suggestion || !currentState.position || !editor || !monaco) {
          return currentState;
        }

        const { line, column } = currentState.position;
        const sanitizedSuggestion = currentState.suggestion.replace(/^\d+:\s*/gm, "");

        editor.executeEdits("", [
          {
            range: new monaco.Range(line, column, line, column),
            text: sanitizedSuggestion,
            forceMoveMarkers: true,
          },
        ]);

        if (editor && currentState.decoration.length > 0) {
          editor.deltaDecorations(currentState.decoration, []);
        }

        return {
          ...currentState,
          suggestion: null,
          position: null,
          decoration: [],
        };
      });
    },
    []
  );

  const rejectSuggestion = useCallback((editor: any) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setState((currentState) => {
      if (editor && currentState.decoration.length > 0) {
        editor.deltaDecorations(currentState.decoration, []);
      }
      return {
        ...currentState,
        suggestion: null,
        position: null,
        decoration: [],
      };
    });
  }, []);

  const clearSuggestion = useCallback((editor: any) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setState((currentState) => {
      if (editor && currentState.decoration.length > 0) {
        editor.deltaDecorations(currentState.decoration, []);
      }
      return {
        ...currentState,
        suggestion: null,
        position: null,
        decoration: [],
      };
    });
  }, []);

  return {
    ...state,
    toggleEnabled,
    fetchSuggestion,
    acceptSuggestion,
    rejectSuggestion,
    clearSuggestion,
  };
};
