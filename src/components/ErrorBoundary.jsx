import { Component } from "react";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            background: "#0a0a0f",
            color: "#e0e0e8",
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'JetBrains Mono', monospace",
            padding: "24px",
          }}
        >
          <div
            style={{
              background: "#0e0e18",
              border: "1px solid #ff444444",
              borderRadius: "12px",
              padding: "32px",
              maxWidth: "480px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "32px", marginBottom: "16px" }}>
              :/
            </div>
            <h2
              style={{
                fontSize: "16px",
                fontWeight: 600,
                marginBottom: "12px",
              }}
            >
              Something went wrong
            </h2>
            <p
              style={{
                fontSize: "12px",
                color: "#888",
                lineHeight: 1.6,
                marginBottom: "20px",
              }}
            >
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "8px 20px",
                background: "#1a1a2e",
                border: "1px solid #2a2a3e",
                borderRadius: "6px",
                color: "#00ff88",
                cursor: "pointer",
                fontSize: "12px",
                fontFamily: "inherit",
              }}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export class TabErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            background: "#0e0e18",
            border: "1px solid #ff444444",
            borderRadius: "12px",
            padding: "24px",
            textAlign: "center",
          }}
        >
          <p style={{ color: "#888", fontSize: "13px", marginBottom: "12px" }}>
            This tab encountered an error.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{
              padding: "6px 16px",
              background: "#1a1a2e",
              border: "1px solid #2a2a3e",
              borderRadius: "6px",
              color: "#00ff88",
              cursor: "pointer",
              fontSize: "12px",
              fontFamily: "inherit",
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
