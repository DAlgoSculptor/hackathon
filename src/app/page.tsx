"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Search, 
  Settings, 
  MessageSquare, 
  Plus, 
  Download, 
  Check, 
  Loader2, 
  Sparkles, 
  MapPin, 
  Phone, 
  ExternalLink, 
  Send,
  Mail,
  User,
  Info
} from "lucide-react";
import { jsPDF } from "jspdf";

interface Competitor {
  name: string;
  website: string;
}

interface CompanyReport {
  companyName: string;
  website: string;
  phone: string;
  address: string;
  productsServices: string[];
  painPoints: string[];
  competitors: Competitor[];
}

export default function Home() {
  // Config states
  const [openrouterKey, setOpenrouterKey] = useState("");
  const [serperKey, setSerperKey] = useState("");
  const [model, setModel] = useState("google/gemini-2.5-flash");
  
  const [botToken, setBotToken] = useState("");
  const [channelId, setChannelId] = useState("");
  const [applicantName, setApplicantName] = useState("");
  const [applicantEmail, setApplicantEmail] = useState("");
  
  // UI Panel control
  const [activeTab, setActiveTab] = useState<"api" | "discord">("api");
  const [query, setQuery] = useState("");
  
  // App state
  const [isLoading, setIsLoading] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [report, setReport] = useState<CompanyReport | null>(null);
  const [discordStatus, setDiscordStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const [isConfigSaved, setIsConfigSaved] = useState(false);
  const [isDiscordConfigSaved, setIsDiscordConfigSaved] = useState(false);

  const timeoutIdsRef = useRef<NodeJS.Timeout[]>([]);
  const clearAllTimeouts = () => {
    timeoutIdsRef.current.forEach(clearTimeout);
    timeoutIdsRef.current = [];
  };

  // Load configuration from localstorage on mount
  useEffect(() => {
    const savedOrKey = localStorage.getItem("openrouterKey") || "";
    const savedSKey = localStorage.getItem("serperKey") || "6d31180e72257ee0c47a5a1b1c6a4261f19887b8";
    const savedModel = localStorage.getItem("model") || "google/gemini-2.5-flash";
    
    const savedBotToken = localStorage.getItem("botToken") || "";
    const savedChannelId = localStorage.getItem("channelId") || "";
    const savedApplicantName = localStorage.getItem("applicantName") || "";
    const savedApplicantEmail = localStorage.getItem("applicantEmail") || "";

    setOpenrouterKey(savedOrKey);
    setSerperKey(savedSKey);
    setModel(savedModel);
    
    setBotToken(savedBotToken);
    setChannelId(savedChannelId);
    setApplicantName(savedApplicantName);
    setApplicantEmail(savedApplicantEmail);

    return () => {
      clearAllTimeouts();
    };
  }, []);

  const saveApiConfig = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("openrouterKey", openrouterKey);
    localStorage.setItem("serperKey", serperKey);
    localStorage.setItem("model", model);
    setIsConfigSaved(true);
    setTimeout(() => setIsConfigSaved(false), 2000);
  };

  const saveDiscordConfig = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("botToken", botToken);
    localStorage.setItem("channelId", channelId);
    localStorage.setItem("applicantName", applicantName);
    localStorage.setItem("applicantEmail", applicantEmail);
    setIsDiscordConfigSaved(true);
    setTimeout(() => setIsDiscordConfigSaved(false), 2000);
  };

  // PDF Generator helper
  const getPdfDocument = (reportData: CompanyReport) => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    // Dark header bar
    doc.setFillColor(16, 18, 26);
    doc.rect(0, 0, 210, 30, "F");

    // Header text
    doc.setTextColor(245, 196, 83);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("RELU CONSULTANCY • COMPANY RESEARCH REPORT", 15, 12);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text(reportData.companyName, 15, 22);

    let y = 42;

    const drawSectionHeader = (title: string) => {
      // Check if page height reached
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      doc.setTextColor(190, 140, 50); // Darker Gold for PDF accessibility
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(title, 15, y);
      y += 2;
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.line(15, y, 195, y);
      y += 6;
    };

    // 1. Company Info
    drawSectionHeader("COMPANY INFORMATION");
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    
    doc.text("Website", 15, y);
    doc.text("Phone", 15, y + 6);
    doc.text("Address", 15, y + 12);

    doc.setTextColor(51, 51, 51);
    doc.text(reportData.website, 45, y);
    doc.text(reportData.phone || "Not publicly listed", 45, y + 6);
    doc.text(reportData.address || "Not publicly listed", 45, y + 12);
    y += 20;

    // 2. Products & Services
    drawSectionHeader("PRODUCTS & SERVICES");
    doc.setTextColor(51, 51, 51);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);

    if (reportData.productsServices && reportData.productsServices.length > 0) {
      reportData.productsServices.forEach((prod) => {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        doc.text(`• ${prod}`, 17, y);
        y += 6;
      });
    } else {
      doc.text("No products listed.", 17, y);
      y += 6;
    }
    y += 4;

    // 3. Pain Points
    drawSectionHeader("AI-GENERATED PAIN POINTS");
    doc.setTextColor(51, 51, 51);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    if (reportData.painPoints && reportData.painPoints.length > 0) {
      reportData.painPoints.forEach((pt) => {
        const lines = doc.splitTextToSize(pt, 175);
        if (y + (lines.length * 5) > 280) {
          doc.addPage();
          y = 20;
        }
        lines.forEach((line: string) => {
          doc.text(`• ${line}`, 17, y);
          y += 5.5;
        });
        y += 2;
      });
    } else {
      doc.text("No pain points identified.", 17, y);
      y += 6;
    }
    y += 4;

    // 4. Competitors
    drawSectionHeader("COMPETITORS");
    if (reportData.competitors && reportData.competitors.length > 0) {
      reportData.competitors.forEach((comp) => {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(51, 51, 51);
        doc.text(comp.name, 15, y);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(comp.website, 75, y);
        y += 6;
      });
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(51, 51, 51);
      doc.text("No competitors identified.", 15, y);
      y += 6;
    }

    return doc;
  };

  const handleDownloadPdf = () => {
    if (!report) return;
    const doc = getPdfDocument(report);
    const fileName = `${report.companyName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_research_report.pdf`;
    doc.save(fileName);
  };

  const handleSendToDiscord = async (reportData: CompanyReport) => {
    if (!botToken || !channelId || !applicantName || !applicantEmail) {
      setErrorMessage("Please fill out all Discord configuration settings in the sidebar to send to Discord.");
      setActiveTab("discord");
      return;
    }

    setDiscordStatus("sending");
    try {
      const doc = getPdfDocument(reportData);
      
      // Convert to base64
      const arrayBuffer = doc.output("arraybuffer");
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const pdfBase64 = btoa(binary);

      const response = await fetch("/api/discord", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          botToken,
          channelId,
          applicantName,
          applicantEmail,
          companyName: reportData.companyName,
          companyWebsite: reportData.website,
          pdfBase64
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || "Failed to post to Discord channel.");
      }

      setDiscordStatus("success");
    } catch (err: any) {
      console.error(err);
      setDiscordStatus("error");
      setErrorMessage(err.message || "Could not publish report to Discord.");
    }
  };

  const startResearch = async (searchQuery: string) => {
    const cleanQuery = searchQuery.trim();
    if (!cleanQuery) return;

    if (!serperKey) {
      setErrorMessage("Please configure your Serper.dev key in the sidebar first.");
      setActiveTab("api");
      return;
    }

    clearAllTimeouts();
    setIsLoading(true);
    setErrorMessage("");
    setReport(null);
    setDiscordStatus("idle");
    setProgressText("Initializing research agent...");

    try {
      // Step-by-step progress simulation to match UI/UX
      const t1 = setTimeout(() => setProgressText("Searching for official website details on Serper.dev..."), 1500);
      const t2 = setTimeout(() => setProgressText("Crawling primary and secondary web pages..."), 3500);
      const t3 = setTimeout(() => setProgressText("Extracting metadata, contact details, and products..."), 6000);
      const t4 = setTimeout(() => setProgressText("Engaging OpenRouter AI for reasoning and analysis..."), 8500);
      timeoutIdsRef.current = [t1, t2, t3, t4];

      const response = await fetch("/api/research", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          query: cleanQuery,
          openrouterKey,
          serperKey,
          model
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch research report.");
      }

      setReport(data);
      
      // Auto post to Discord if bot configuration and applicant details are fully set
      if (botToken && channelId && applicantName && applicantEmail) {
        // Run asynchronously
        handleSendToDiscord(data);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "An unexpected error occurred during research.");
    } finally {
      setIsLoading(false);
      setProgressText("");
      clearAllTimeouts();
    }
  };

  const handleQuickSearch = (target: string) => {
    setQuery(target);
    startResearch(target);
  };

  return (
    <div className="app-container">
      {/* Sidebar Panel */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-icon">R</div>
          <div className="logo-text">
            <span className="logo-title">Relu Consultancy</span>
            <span className="logo-subtitle">Company Intelligence</span>
          </div>
        </div>

        <div className="sidebar-content">
          <button 
            className="new-research-btn"
            onClick={() => {
              setReport(null);
              setQuery("");
              setErrorMessage("");
              setDiscordStatus("idle");
            }}
          >
            <Plus size={16} />
            New Research
          </button>

          {/* Config Tabs */}
          <div className="tab-buttons">
            <button 
              className={`tab-btn ${activeTab === "api" ? "active" : ""}`}
              onClick={() => setActiveTab("api")}
            >
              API Keys
            </button>
            <button 
              className={`tab-btn ${activeTab === "discord" ? "active" : ""}`}
              onClick={() => setActiveTab("discord")}
            >
              Discord
            </button>
          </div>

          {/* API Keys Configuration Form */}
          {activeTab === "api" && (
            <form onSubmit={saveApiConfig} className="config-form animate-fade-in">
              <div className="form-group">
                <label className="form-label">OpenRouter API Key</label>
                <input 
                  type="password" 
                  className="form-input"
                  placeholder="sk-or-v1-..."
                  value={openrouterKey}
                  onChange={(e) => setOpenrouterKey(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Serper.dev API Key</label>
                <input 
                  type="password" 
                  className="form-input"
                  placeholder="Your Serper key..."
                  value={serperKey}
                  onChange={(e) => setSerperKey(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">AI Model Selection</label>
                <select 
                  className="form-select"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                >
                  <option value="google/gemini-2.5-flash">Gemini 2.5 Flash (Fast)</option>
                  <option value="meta-llama/llama-3.1-70b-instruct">Llama 3.1 70B</option>
                  <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                  <option value="openai/gpt-4o-mini">GPT-4o Mini</option>
                </select>
              </div>

              <button 
                type="submit" 
                className={`save-btn ${isConfigSaved ? "saved" : ""}`}
              >
                {isConfigSaved ? "Configuration Saved ✓" : "Save Configuration"}
              </button>
            </form>
          )}

          {/* Discord & Applicant Configuration Form */}
          {activeTab === "discord" && (
            <form onSubmit={saveDiscordConfig} className="config-form animate-fade-in">
              <div className="sidebar-info-box">
                <strong>Discord Bot Integration</strong>
                <p style={{ marginTop: '4px', fontSize: '11px' }}>
                  After research completes, the report auto-sends to your configured channel.
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Bot Token</label>
                <input 
                  type="password" 
                  className="form-input"
                  placeholder="Bot token..."
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Channel ID</label>
                <input 
                  type="text" 
                  className="form-input"
                  placeholder="000000000000000000"
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value)}
                />
              </div>

              <div style={{ margin: '8px 0 2px 0' }}>
                <span className="form-label" style={{ display: 'block', fontSize: '10px' }}>Applicant Details</span>
              </div>

              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  className="form-input"
                  placeholder="Your full name"
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input 
                  type="email" 
                  className="form-input"
                  placeholder="email@example.com"
                  value={applicantEmail}
                  onChange={(e) => setApplicantEmail(e.target.value)}
                />
              </div>

              <button 
                type="submit" 
                className={`save-btn ${isDiscordConfigSaved ? "saved" : ""}`}
              >
                {isDiscordConfigSaved ? "Saved ✓" : "Save Discord Config"}
              </button>
            </form>
          )}
        </div>

        <div className="sidebar-footer">
          <span className="how-it-works-title">How It Works</span>
          <ul className="how-it-works-list">
            <li className="how-it-works-item">
              <span className="how-it-works-num">1</span>
              <span>Enter a company name or URL</span>
            </li>
            <li className="how-it-works-item">
              <span className="how-it-works-num">2</span>
              <span>Serper.dev searches & crawls it</span>
            </li>
            <li className="how-it-works-item">
              <span className="how-it-works-num">3</span>
              <span>OpenRouter AI generates insights</span>
            </li>
            <li className="how-it-works-item">
              <span className="how-it-works-num">4</span>
              <span>Download a professional PDF report</span>
            </li>
          </ul>
          <div className="tech-tags">
            <span>OPENROUTER</span>
            <span>•</span>
            <span>SERPER</span>
            <span>•</span>
            <span>JSPDF</span>
          </div>
        </div>
      </aside>

      {/* Main Interactive Screen */}
      <main className="main-panel">
        <header className="main-header">
          <div className="main-header-title">
            Company Research
            <span className="live-badge">
              <span className="live-dot pulse-badge"></span>
              Live
            </span>
          </div>
        </header>

        <div className="main-content">
          {/* Welcome Screen */}
          {!isLoading && !report && (
            <div className="welcome-screen">
              <span className="welcome-label">AI-Powered Intelligence</span>
              <h1 className="welcome-title">Know any company in minutes.</h1>
              <p className="welcome-desc">
                Enter a company name or website URL to get AI-powered insights, competitor analysis, pain points, and a professional PDF report.
              </p>
              
              <div className="quick-tags">
                <button className="quick-tag" onClick={() => handleQuickSearch("stripe.com")}>stripe.com</button>
                <button className="quick-tag" onClick={() => handleQuickSearch("Tesla")}>Tesla</button>
                <button className="quick-tag" onClick={() => handleQuickSearch("Microsoft")}>Microsoft</button>
                <button className="quick-tag" onClick={() => handleQuickSearch("OpenAI")}>OpenAI</button>
              </div>

              {(!openrouterKey || !serperKey) && (
                <div className="key-hint">
                  Configure API keys in the sidebar to get started
                </div>
              )}

              {errorMessage && (
                <div style={{ color: '#EF4444', fontSize: '13px', marginTop: '16px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', width: '100%' }}>
                  {errorMessage}
                </div>
              )}
            </div>
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="loading-overlay animate-fade-in">
              <div className="spinner"></div>
              <h2 className="loading-title">Conducting Company Research</h2>
              <p className="loading-progress">{progressText}</p>
            </div>
          )}

          {/* Report Viewer */}
          {!isLoading && report && (
            <div className="report-container">
              {errorMessage && (
                <div style={{ color: '#EF4444', fontSize: '13px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px' }}>
                  {errorMessage}
                </div>
              )}
              
              <div className="report-card">
                <div className="report-header">
                  <div className="report-title-group">
                    <h1 className="report-title">{report.companyName}</h1>
                    <a 
                      href={report.website} 
                      className="report-website" 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      {report.website} <ExternalLink size={12} style={{ display: 'inline' }} />
                    </a>
                  </div>
                  <span className="status-badge">Research Complete</span>
                </div>

                <div className="report-info-grid">
                  <div className="info-box">
                    <span className="info-label">Phone</span>
                    <p className="info-value">{report.phone || "Not publicly listed"}</p>
                  </div>
                  <div className="info-box">
                    <span className="info-label">Address</span>
                    <p className="info-value">{report.address || "Not publicly listed"}</p>
                  </div>
                </div>

                <div className="report-section">
                  <h3 className="section-title">Products & Services</h3>
                  <div className="tag-cloud">
                    {report.productsServices && report.productsServices.map((prod, index) => (
                      <span key={index} className="tag-item">{prod}</span>
                    ))}
                  </div>
                </div>

                <div className="report-section">
                  <h3 className="section-title">AI-Generated Pain Points</h3>
                  <ul className="pain-points-list">
                    {report.painPoints && report.painPoints.map((pt, index) => (
                      <li key={index} className="pain-point-item">{pt}</li>
                    ))}
                  </ul>
                </div>

                <div className="report-section">
                  <h3 className="section-title">Competitors</h3>
                  <div className="competitors-grid">
                    {report.competitors && report.competitors.map((comp, index) => (
                      <div key={index} className="competitor-card">
                        <span className="competitor-name">{comp.name}</span>
                        <a 
                          href={comp.website.startsWith("http") ? comp.website : `https://${comp.website}`} 
                          className="competitor-link"
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          {comp.website}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="action-bar">
                <button 
                  className="pdf-download-btn"
                  onClick={handleDownloadPdf}
                >
                  <Download size={16} />
                  Download PDF Report
                </button>

                <button 
                  className={`discord-send-btn ${discordStatus === "success" ? "success" : ""}`}
                  onClick={() => handleSendToDiscord(report)}
                  disabled={discordStatus === "sending" || discordStatus === "success"}
                >
                  {discordStatus === "sending" && <Loader2 size={16} className="animate-spin" />}
                  {discordStatus === "success" && <Check size={16} />}
                  {discordStatus === "idle" && "Send to Discord"}
                  {discordStatus === "sending" && "Uploading Report..."}
                  {discordStatus === "success" && "Sent to Discord"}
                  {discordStatus === "error" && "Retry Discord Send"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Floating Chat Input Bar */}
        <div className="chat-input-container">
          <div style={{ width: '100%', maxWidth: '800px' }}>
            <div className="chat-input-wrapper">
              <input 
                type="text" 
                className="chat-input"
                placeholder="Enter a company name (e.g. Stripe) or website URL (e.g. https://stripe.com)..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    startResearch(query);
                  }
                }}
              />
              <button 
                className="research-btn"
                onClick={() => startResearch(query)}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Research →
              </button>
            </div>
            <div className="chat-shortcuts-hint">
              Enter to Research • Shift+Enter for new line
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
