import AITerminalAgent from "./components/AITerminalAgent";
import ErrorBoundary from "./components/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary>
      <div
        style={{
          backgroundColor: "#111827",
          minHeight: "100vh",
          padding: "20px",
        }}
      >
        <AITerminalAgent />
      </div>
    </ErrorBoundary>
  );
}

export default App;
