import { useState } from "react";
import { createTodo, generateTodo, type TodoItemForCreate } from "../apiClient";

interface TodoFormProps {
  onTodoCreated: () => void;
}

const TodoForm = ({ onTodoCreated }: TodoFormProps) => {
  const [prompt, setPrompt] = useState<string>("");
  const [generatedTodo, setGeneratedTodo] = useState<TodoItemForCreate | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  async function generateTodoFromPrompt() {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    try {
      const generated = await generateTodo(prompt);
      setGeneratedTodo(generated);
      setPrompt("");
    } catch (error) {
      console.error("Failed to generate todo:", error);
    } finally {
      setIsGenerating(false);
    }
  }

  const handleCreateTodo = async () => {
    if (!generatedTodo) return;

    await createTodo(
      generatedTodo.title,
      generatedTodo.description,
      generatedTodo.deadline,
    );
    setGeneratedTodo(null);
    onTodoCreated();
  };

  return (
    <div className="todo-form">
      {!generatedTodo && (
        <div className="prompt-input-container">
          <input
            type="text"
            placeholder="Describe what you want to do (e.g., 'Plan a birthday party for next week')"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyUp={(e) => e.key === "Enter" && generateTodoFromPrompt()}
            disabled={isGenerating}
            className="prompt-input"
          />
          <button
            onClick={generateTodoFromPrompt}
            disabled={isGenerating || !prompt.trim()}
            className="generate-button"
          >
            {isGenerating ? "Generating..." : "Generate Todo"}
          </button>
        </div>
      )}

      {generatedTodo && (
        <div className="preview-section">
          <h3>Review and Edit Generated Todo:</h3>
          <div className="form-row">
            <div className="form-field">
              <label>Title</label>
              <input
                type="text"
                value={generatedTodo?.title || ""}
                onChange={(e) =>
                  setGeneratedTodo((prev) =>
                    prev ? { ...prev, title: e.target.value } : null,
                  )
                }
              />
            </div>
            <div className="form-field">
              <label>Deadline</label>
              <input
                type="date"
                value={
                  generatedTodo?.deadline.toISOString().split("T")[0] || ""
                }
                onChange={(e) =>
                  setGeneratedTodo((prev) =>
                    prev
                      ? { ...prev, deadline: new Date(e.target.value) }
                      : null,
                  )
                }
              />
            </div>
          </div>
          <div className="form-field">
            <label>Description</label>
            <textarea
              value={generatedTodo?.description || ""}
              onChange={(e) =>
                setGeneratedTodo((prev) =>
                  prev ? { ...prev, description: e.target.value } : null,
                )
              }
              rows={3}
            />
          </div>
          <div className="button-group">
            <button onClick={handleCreateTodo} className="primary-button">
              Create Todo
            </button>
            <button
              onClick={() => setGeneratedTodo(null)}
              className="secondary-button"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TodoForm;
