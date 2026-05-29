"use client";

import { useState, useEffect, useCallback } from "react";
import { Credential, decryptData, encryptData } from "@/lib/crypto";
import { store } from "@/lib/store";
import { getPlatformColor, getPlatformPreset, platformPresets } from "@/lib/platforms";
import { syncClient } from "@/lib/sync";

type View = "list" | "detail" | "edit" | "add";
type SidebarTab = "vault" | "sync";

export default function Home() {
  const [authed, setAuthed] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [view, setView] = useState<View>("list");
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("vault");

  useEffect(() => {
    const unsub = store.subscribe(() => setCredentials([...store.getAll()]));
    return unsub;
  }, []);

  useEffect(() => {
    syncClient.isReady().then((ready) => {
      if (ready) {
        setAuthed(true);
        if (store.getAll().length === 0) {
          syncClient.pullVault().then((data) => {
            if (data) store.setAll(data);
          }).catch(() => {}).finally(() => setInitializing(false));
        } else {
          setInitializing(false);
        }
      } else {
        setInitializing(false);
      }
    });
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const handleFileImport = useCallback(async (file: File, pass: string) => {
    try {
      const text = await file.text();
      const data = await decryptData(text, pass);
      store.setAll(data);
      store.setPassphrase(pass);
      setAuthed(true);
      setError("");
    } catch {
      setError("解密失败，请检查密钥是否正确");
    }
  }, []);

  const handleCloudLogin = useCallback(() => {
    setAuthed(true);
    setError("");
  }, []);

  const handleSync = useCallback(async (action: "push" | "pull") => {
    setSyncing(true);
    setSyncMsg("");
    try {
      if (action === "push") {
        await syncClient.pushVault(store.getAll());
        setSyncMsg("已上传到云端");
      } else {
        const data = await syncClient.pullVault();
        if (data) {
          store.setAll(data);
          setSyncMsg(`已从云端同步 ${data.length} 条记录`);
        } else {
          setSyncMsg("云端暂无数据");
        }
      }
    } catch (e: unknown) {
      setSyncMsg(e instanceof Error ? e.message : "同步失败");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(""), 4000);
    }
  }, []);

  const filtered = searchQuery ? store.search(searchQuery) : credentials;
  const selected = selectedId ? store.getById(selectedId) : null;

  if (initializing) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <img src="/logo.png" alt="KeyKeep" className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-xs text-[var(--on-surface-variant)]">加载中...</p>
        </div>
      </div>
    );
  }

  if (!authed) {
    return (
      <UnlockScreen
        passphrase={passphrase}
        setPassphrase={setPassphrase}
        error={error}
        onImport={handleFileImport}
        onCloudLogin={handleCloudLogin}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />
    );
  }

  return (
    <div className="h-screen flex overflow-hidden bg-[var(--background)]">
      {/* ── Sidebar ── */}
      <aside className="w-[220px] shrink-0 flex flex-col bg-[var(--sidebar-bg)] border-r border-black/10">
        <div className="h-14 flex items-center gap-2.5 px-5 border-b border-white/[0.06]">
          <img src="/logo.png" alt="KeyKeep" className="w-7 h-7 rounded-md object-cover bg-white" />
          <span className="text-sm font-semibold text-white tracking-tight">KeyKeep</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <SidebarItem
            active={sidebarTab === "vault"}
            onClick={() => { setSidebarTab("vault"); setView("list"); }}
            icon={<path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />}
            label="保险库"
            badge={credentials.length > 0 ? String(credentials.length) : undefined}
          />
          {syncClient.isLoggedIn() && (
            <SidebarItem
              active={sidebarTab === "sync"}
              onClick={() => setSidebarTab("sync")}
              icon={<path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />}
              label="云同步"
            />
          )}
        </nav>

        <div className="px-3 py-4 border-t border-white/[0.06] space-y-1">
          <button onClick={() => setDarkMode(!darkMode)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)] transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              {darkMode
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              }
            </svg>
            {darkMode ? "浅色模式" : "深色模式"}
          </button>
          {syncClient.isLoggedIn() && (
            <div className="flex items-center gap-2.5 px-3 py-2">
              <div className="w-6 h-6 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-[10px] font-bold">
                {(syncClient.getEmail()?.charAt(0) || "U").toUpperCase()}
              </div>
              <span className="text-[11px] text-[var(--sidebar-text)] truncate flex-1">{syncClient.getEmail()}</span>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main Area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {sidebarTab === "vault" && (
          <>
            {/* Top bar */}
            <header className="h-14 shrink-0 flex items-center gap-4 px-6 bg-[var(--surface)] border-b border-[var(--outline)]">
              <div className="relative flex-1 max-w-md">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--on-surface-variant)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索平台、用户名..."
                  className="w-full h-9 pl-9 pr-4 text-sm rounded-lg bg-[var(--surface-variant)] border border-[var(--outline)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition placeholder:text-[var(--on-surface-variant)]"
                />
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <button onClick={() => setShowExportModal(true)} className="h-9 px-4 text-[13px] font-medium rounded-lg border border-[var(--outline)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-variant)] hover:text-[var(--on-surface)] transition">
                  导出
                </button>
                <button onClick={() => { setView("add"); setSelectedId(null); }} className="h-9 px-4 text-[13px] font-medium rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition shadow-sm flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                  添加
                </button>
              </div>
            </header>

            {syncMsg && (
              <div className="mx-6 mt-3 px-4 py-2 rounded-lg bg-[var(--primary-subtle)] text-[var(--primary)] text-sm font-medium text-center animate-pulse">
                {syncMsg}
              </div>
            )}

            {/* Vault content: list + detail split */}
            <div className="flex-1 flex min-h-0">
              {/* List panel */}
              <div className={`${view === "list" || view === "detail" ? "" : "hidden"} ${selected && (view === "detail") ? "w-[340px] shrink-0 border-r border-[var(--outline)]" : "flex-1"} flex flex-col bg-[var(--surface-variant)] overflow-hidden`}>
                <div className="px-5 py-3 border-b border-[var(--outline)] flex items-center justify-between bg-[var(--surface)]">
                  <span className="text-xs font-semibold text-[var(--on-surface-variant)] uppercase tracking-wider">
                    {searchQuery ? `搜索结果 (${filtered.length})` : `全部账号 (${credentials.length})`}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-[var(--on-surface-variant)]">
                      <svg className="w-12 h-12 mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>
                      <p className="text-sm">暂无数据</p>
                      <p className="text-xs mt-1 opacity-60">点击上方"添加"来创建你的第一条记录</p>
                    </div>
                  ) : (
                    <div>
                      {filtered.map((cred) => (
                        <button
                          key={cred.id}
                          onClick={() => { setSelectedId(cred.id); setView("detail"); }}
                          className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors border-b border-[var(--outline)] hover:bg-[var(--surface)] ${selectedId === cred.id && view === "detail" ? "bg-[var(--primary-subtle)] border-l-2 border-l-[var(--primary)]" : ""}`}
                        >
                          <PlatformIcon iconId={cred.platformIcon} name={cred.platform} size={36} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{cred.platform}</p>
                            <p className="text-xs text-[var(--on-surface-variant)] truncate">{cred.username}</p>
                          </div>
                          {cred.loginMethod === "OAuth" && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-variant)] text-[var(--on-surface-variant)] border border-[var(--outline)] font-medium">OAuth</span>
                          )}
                          {cred.tags && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--primary-subtle)] text-[var(--primary)] font-medium hidden sm:inline">
                              {cred.tags.split(",")[0]}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Detail / Edit panel */}
              {view === "detail" && selected && (
                <div className="flex-1 overflow-y-auto bg-[var(--background)]">
                  <DetailView
                    credential={selected}
                    allCredentials={credentials}
                    onBack={() => { setSelectedId(null); setView("list"); }}
                    onEdit={() => setView("edit")}
                    onDelete={() => { store.remove(selected.id); setSelectedId(null); setView("list"); }}
                    onNavigate={(id) => setSelectedId(id)}
                  />
                </div>
              )}

              {view === "edit" && selected && (
                <div className="flex-1 overflow-y-auto bg-[var(--background)]">
                  <EditForm
                    credential={selected}
                    allCredentials={credentials}
                    onSave={(c) => { store.update(c); setView("detail"); }}
                    onCancel={() => setView("detail")}
                  />
                </div>
              )}

              {view === "add" && (
                <div className="flex-1 overflow-y-auto bg-[var(--background)]">
                  <EditForm
                    allCredentials={credentials}
                    onSave={(c) => { store.add(c); setView("list"); }}
                    onCancel={() => setView("list")}
                  />
                </div>
              )}

              {view === "list" && !selected && filtered.length > 0 && (
                <div className="hidden" />
              )}
            </div>
          </>
        )}

        {sidebarTab === "sync" && (
          <SyncView
            syncing={syncing}
            syncMsg={syncMsg}
            onPush={() => handleSync("push")}
            onPull={() => handleSync("pull")}
            onLogout={async () => { await syncClient.logout(); store.setAll([]); setAuthed(false); setSidebarTab("vault"); }}
          />
        )}
      </div>

      {showExportModal && <ExportModal onClose={() => setShowExportModal(false)} />}
    </div>
  );
}

/* ─── Sidebar Item ─── */

function SidebarItem({ active, onClick, icon, label, badge }: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${active ? "bg-[var(--sidebar-active)] text-[var(--sidebar-text-active)]" : "text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-text-active)]"}`}
    >
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>{icon}</svg>
      <span className="flex-1 text-left">{label}</span>
      {badge && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 min-w-[20px] text-center">{badge}</span>}
    </button>
  );
}

/* ─── Sync Full View ─── */

function SyncView({ syncing, syncMsg, onPush, onPull, onLogout }: {
  syncing: boolean;
  syncMsg: string;
  onPush: () => void;
  onPull: () => void;
  onLogout: () => void;
}) {
  const [showKey, setShowKey] = useState(false);
  return (
    <div className="flex-1 overflow-y-auto">
      <header className="h-14 shrink-0 flex items-center px-6 bg-[var(--surface)] border-b border-[var(--outline)]">
        <h2 className="text-sm font-semibold">云同步</h2>
      </header>
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Status card */}
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--outline)] p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-[var(--primary-subtle)] flex items-center justify-center">
              <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold">同步状态</p>
              <p className="text-xs text-[var(--on-surface-variant)] mt-0.5">{syncClient.getEmail()} · <span className="text-[var(--success)] font-medium">已连接</span></p>
            </div>
          </div>

          {syncMsg && (
            <div className="mb-4 px-4 py-2.5 rounded-lg bg-[var(--primary-subtle)] text-[var(--primary)] text-sm font-medium text-center">
              {syncMsg}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button onClick={onPull} disabled={syncing} className="h-10 text-sm font-medium rounded-lg border border-[var(--outline)] hover:bg-[var(--surface-variant)] disabled:opacity-40 transition flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
              {syncing ? "同步中..." : "从云端拉取"}
            </button>
            <button onClick={onPush} disabled={syncing} className="h-10 text-sm font-medium rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-40 transition flex items-center justify-center gap-2 shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
              {syncing ? "同步中..." : "上传到云端"}
            </button>
          </div>
        </div>

        {/* Secret Key */}
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--outline)] p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold">设备密钥</p>
              <p className="text-xs text-[var(--on-surface-variant)] mt-0.5">在新设备登录时需要此密钥</p>
            </div>
            <button onClick={() => setShowKey(!showKey)} className="text-xs px-3 py-1.5 rounded-lg border border-[var(--outline)] hover:bg-[var(--surface-variant)] transition font-medium">
              {showKey ? "隐藏" : "显示密钥"}
            </button>
          </div>
          {showKey && (
            <div className="space-y-3">
              <div className="font-mono text-sm bg-[var(--surface-variant)] p-4 rounded-lg break-all select-all leading-relaxed tracking-wide border border-[var(--outline)]">
                {syncClient.getSecretKey()}
              </div>
              <button onClick={() => navigator.clipboard.writeText(syncClient.getSecretKey() || "")} className="text-xs font-medium text-[var(--primary)] hover:underline">
                复制到剪贴板
              </button>
            </div>
          )}
        </div>

        {/* Danger zone */}
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--error)]/20 p-6">
          <p className="text-sm font-semibold text-[var(--error)] mb-1">危险操作</p>
          <p className="text-xs text-[var(--on-surface-variant)] mb-4">退出登录将清除本地会话，你的云端数据不会受影响。</p>
          <button onClick={onLogout} className="h-9 px-4 text-sm font-medium rounded-lg border border-[var(--error)]/30 text-[var(--error)] hover:bg-[var(--error-subtle)] transition">
            退出登录
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Export Modal ─── */

function ExportModal({ onClose }: { onClose: () => void }) {
  const [exportPass, setExportPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [exportError, setExportError] = useState("");

  const handleExport = async () => {
    if (exportPass.length < 4) { setExportError("密钥至少 4 位字符"); return; }
    if (exportPass !== confirmPass) { setExportError("两次输入的密钥不一致"); return; }
    const encrypted = await encryptData(store.getAll(), exportPass);
    const blob = new Blob([encrypted], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `keykeep_backup_${new Date().toISOString().slice(0, 10)}.keykeep`;
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[var(--surface)] rounded-xl shadow-[var(--shadow-lg)] border border-[var(--outline)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--outline)]">
          <h3 className="text-sm font-semibold">导出加密备份</h3>
          <p className="text-xs text-[var(--on-surface-variant)] mt-1">设置一个密钥用于加密导出数据</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium mb-1.5 block">加密密钥</label>
            <input
              type="password"
              value={exportPass}
              onChange={(e) => { setExportPass(e.target.value); setExportError(""); }}
              placeholder="至少 4 位字符"
              className="w-full h-9 px-3 text-sm rounded-lg bg-[var(--surface-variant)] border border-[var(--outline)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1.5 block">确认密钥</label>
            <input
              type="password"
              value={confirmPass}
              onChange={(e) => { setConfirmPass(e.target.value); setExportError(""); }}
              placeholder="再次输入密钥"
              className="w-full h-9 px-3 text-sm rounded-lg bg-[var(--surface-variant)] border border-[var(--outline)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            />
          </div>
          {exportError && <p className="text-xs text-[var(--error)]">{exportError}</p>}
        </div>
        <div className="px-6 py-4 border-t border-[var(--outline)] flex justify-end gap-2 bg-[var(--surface-variant)]">
          <button onClick={onClose} className="h-9 px-4 text-sm font-medium rounded-lg border border-[var(--outline)] hover:bg-[var(--surface)] transition">
            取消
          </button>
          <button onClick={handleExport} disabled={!exportPass || !confirmPass} className="h-9 px-4 text-sm font-medium rounded-lg bg-[var(--primary)] text-white disabled:opacity-40 hover:bg-[var(--primary-hover)] transition shadow-sm">
            导出
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Unlock Screen ─── */

function UnlockScreen({ passphrase, setPassphrase, error, onImport, onCloudLogin, darkMode, setDarkMode }: {
  passphrase: string;
  setPassphrase: (v: string) => void;
  error: string;
  onImport: (file: File, pass: string) => void;
  onCloudLogin: () => void;
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [tab, setTab] = useState<"file" | "cloud">("cloud");
  const [cloudMode, setCloudMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [masterPass, setMasterPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [cloudError, setCloudError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registeredKey, setRegisteredKey] = useState("");

  const handleCloudSubmit = async () => {
    setCloudError("");
    setLoading(true);
    try {
      if (cloudMode === "register") {
        if (masterPass.length < 8) { setCloudError("主密码至少 8 个字符"); setLoading(false); return; }
        if (masterPass !== confirmPass) { setCloudError("两次密码不一致"); setLoading(false); return; }
        const { secretKey: sk } = await syncClient.register(email, masterPass);
        setRegisteredKey(sk);
      } else {
        if (!secretKey.trim()) { setCloudError("请输入设备密钥"); setLoading(false); return; }
        await syncClient.login(email, masterPass, secretKey);
        const data = await syncClient.pullVault();
        if (data) store.setAll(data);
        onCloudLogin();
      }
    } catch (e: unknown) {
      setCloudError(e instanceof Error ? e.message : "操作失败");
    } finally {
      setLoading(false);
    }
  };

  if (registeredKey) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--background)]">
        <div className="w-full max-w-md">
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--outline)] overflow-hidden shadow-[var(--shadow-md)]">
            <div className="px-6 py-5 border-b border-[var(--outline)] text-center">
              <div className="w-12 h-12 rounded-full bg-[var(--success)]/10 mx-auto mb-3 flex items-center justify-center">
                <svg className="w-6 h-6 text-[var(--success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h2 className="text-base font-semibold">注册成功</h2>
              <p className="text-xs text-[var(--on-surface-variant)] mt-1">请保存你的设备密钥</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium mb-2 block text-[var(--on-surface-variant)]">设备密钥 (Secret Key)</label>
                <div className="font-mono text-sm bg-[var(--surface-variant)] p-4 rounded-lg break-all select-all leading-relaxed tracking-wide border border-[var(--outline)]">
                  {registeredKey}
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-[var(--error-subtle)] text-[var(--error)] text-xs">
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <p>此密钥只显示一次，丢失后无法恢复！请立即复制保存。</p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[var(--outline)] bg-[var(--surface-variant)] flex gap-2">
              <button
                onClick={() => navigator.clipboard.writeText(registeredKey)}
                className="flex-1 h-9 text-sm font-medium rounded-lg border border-[var(--outline)] hover:bg-[var(--surface)] transition"
              >
                复制密钥
              </button>
              <button
                onClick={onCloudLogin}
                className="flex-1 h-9 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:bg-[var(--primary-hover)] transition shadow-sm"
              >
                进入保险库
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[var(--background)]">
      {/* Left branding */}
      <div className="hidden lg:flex w-[480px] shrink-0 bg-[var(--sidebar-bg)] flex-col items-center justify-center p-12">
        <img src="/logo.png" alt="KeyKeep" className="w-20 h-20 rounded-2xl object-cover bg-white shadow-lg mb-6" />
        <h1 className="text-3xl font-bold text-white tracking-tight mb-3">KeyKeep</h1>
        <p className="text-sm text-[var(--sidebar-text)] text-center max-w-[300px] leading-relaxed">
          端到端加密的密码管理器。你的数据，只有你能解密。
        </p>
        <div className="mt-12 space-y-4 w-full max-w-[280px]">
          <Feature icon="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" text="零知识加密架构" />
          <Feature icon="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" text="AES-256 端到端加密" />
          <Feature icon="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" text="多设备安全同步" />
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[420px]">
          <div className="lg:hidden text-center mb-8">
            <img src="/logo.png" alt="KeyKeep" className="w-14 h-14 rounded-xl object-contain mx-auto mb-4" />
            <h1 className="text-xl font-bold tracking-tight">KeyKeep</h1>
          </div>

          <div className="flex rounded-lg bg-[var(--surface-variant)] p-1 mb-6 border border-[var(--outline)]">
            <button onClick={() => setTab("cloud")} className={`flex-1 h-8 text-xs font-medium rounded-md transition ${tab === "cloud" ? "bg-[var(--surface)] shadow-sm text-[var(--on-surface)]" : "text-[var(--on-surface-variant)]"}`}>
              云同步登录
            </button>
            <button onClick={() => setTab("file")} className={`flex-1 h-8 text-xs font-medium rounded-md transition ${tab === "file" ? "bg-[var(--surface)] shadow-sm text-[var(--on-surface)]" : "text-[var(--on-surface-variant)]"}`}>
              文件导入
            </button>
          </div>

          {tab === "cloud" ? (
            <div className="bg-[var(--surface)] rounded-xl border border-[var(--outline)] overflow-hidden">
              <div className="flex border-b border-[var(--outline)]">
                <button onClick={() => setCloudMode("login")} className={`flex-1 h-10 text-xs font-medium transition ${cloudMode === "login" ? "text-[var(--primary)] border-b-2 border-[var(--primary)]" : "text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]"}`}>
                  登录
                </button>
                <button onClick={() => setCloudMode("register")} className={`flex-1 h-10 text-xs font-medium transition ${cloudMode === "register" ? "text-[var(--primary)] border-b-2 border-[var(--primary)]" : "text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]"}`}>
                  注册
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-medium mb-1.5 block">邮箱</label>
                  <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setCloudError(""); }}
                    placeholder="your@email.com"
                    className="w-full h-9 px-3 text-sm rounded-lg bg-[var(--surface-variant)] border border-[var(--outline)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block">主密码</label>
                  <input type="password" value={masterPass} onChange={(e) => { setMasterPass(e.target.value); setCloudError(""); }}
                    placeholder={cloudMode === "register" ? "至少 8 个字符" : "输入主密码"}
                    className="w-full h-9 px-3 text-sm rounded-lg bg-[var(--surface-variant)] border border-[var(--outline)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition" />
                </div>
                {cloudMode === "register" && (
                  <div>
                    <label className="text-xs font-medium mb-1.5 block">确认主密码</label>
                    <input type="password" value={confirmPass} onChange={(e) => { setConfirmPass(e.target.value); setCloudError(""); }}
                      placeholder="再次输入主密码"
                      className="w-full h-9 px-3 text-sm rounded-lg bg-[var(--surface-variant)] border border-[var(--outline)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition" />
                  </div>
                )}
                {cloudMode === "login" && (
                  <div>
                    <label className="text-xs font-medium mb-1.5 block">设备密钥</label>
                    <input type="text" value={secretKey} onChange={(e) => { setSecretKey(e.target.value); setCloudError(""); }}
                      placeholder="A3-XXXXXX-XXXXXX-XXXXX-XXXXX-XXXXX"
                      className="w-full h-9 px-3 text-sm font-mono rounded-lg bg-[var(--surface-variant)] border border-[var(--outline)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition" />
                    <p className="text-[10px] text-[var(--on-surface-variant)] mt-1.5">注册时生成的设备密钥，用于解密保险库</p>
                  </div>
                )}

                {cloudError && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--error-subtle)] text-[var(--error)] text-xs">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                    {cloudError}
                  </div>
                )}

                <button
                  onClick={handleCloudSubmit}
                  disabled={!email || !masterPass || loading}
                  className="w-full h-10 rounded-lg bg-[var(--primary)] text-white text-sm font-medium disabled:opacity-40 hover:bg-[var(--primary-hover)] transition shadow-sm"
                >
                  {loading ? "处理中..." : cloudMode === "register" ? "注册" : "登录"}
                </button>

                {cloudMode === "register" && (
                  <p className="text-[10px] text-center text-[var(--on-surface-variant)] leading-relaxed">
                    注册后将生成设备密钥，与主密码共同保护数据。<br />服务器零知识架构，永远无法访问你的明文数据。
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-[var(--surface)] rounded-xl border border-[var(--outline)] overflow-hidden">
              <div className="p-6 space-y-5">
                <div
                  className={`relative border-2 border-dashed rounded-xl p-8 text-center transition cursor-pointer ${dragOver ? "border-[var(--primary)] bg-[var(--primary-subtle)]" : "border-[var(--outline)] hover:border-[var(--outline-hover)]"}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
                  onClick={() => document.getElementById("file-input")?.click()}
                >
                  <input id="file-input" type="file" accept=".keykeep,.json" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" />
                  <svg className="w-8 h-8 mx-auto mb-3 text-[var(--on-surface-variant)] opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  {file ? (
                    <p className="text-sm font-medium text-[var(--primary)]">{file.name}</p>
                  ) : (
                    <>
                      <p className="text-sm font-medium">点击或拖拽上传</p>
                      <p className="text-xs text-[var(--on-surface-variant)] mt-1">支持 .keykeep 和 .json 格式</p>
                    </>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium mb-1.5 block">解密密钥</label>
                  <input
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="输入导出时设置的密钥"
                    onKeyDown={(e) => e.key === "Enter" && file && passphrase && onImport(file, passphrase)}
                    className="w-full h-9 px-3 text-sm rounded-lg bg-[var(--surface-variant)] border border-[var(--outline)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--error-subtle)] text-[var(--error)] text-xs">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                    {error}
                  </div>
                )}
              </div>
              <div className="px-6 py-4 border-t border-[var(--outline)] bg-[var(--surface-variant)]">
                <button
                  onClick={() => file && passphrase && onImport(file, passphrase)}
                  disabled={!file || !passphrase}
                  className="w-full h-10 rounded-lg bg-[var(--primary)] text-white text-sm font-medium disabled:opacity-40 hover:bg-[var(--primary-hover)] transition shadow-sm"
                >
                  解密并导入
                </button>
              </div>
            </div>
          )}

          <div className="text-center mt-5">
            <button onClick={() => setDarkMode(!darkMode)} className="text-xs text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] transition">
              {darkMode ? "切换浅色模式" : "切换深色模式"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0">
        <svg className="w-4 h-4 text-[var(--sidebar-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
        </svg>
      </div>
      <span className="text-xs text-[var(--sidebar-text)]">{text}</span>
    </div>
  );
}

/* ─── Detail View ─── */

function DetailView({ credential, allCredentials, onBack, onEdit, onDelete, onNavigate }: {
  credential: Credential;
  allCredentials: Credential[];
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onNavigate: (id: string) => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const linked = credential.linkedAccountId ? allCredentials.find((c) => c.id === credential.linkedAccountId) : null;

  const copy = (label: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-1.5 rounded-lg text-[var(--on-surface-variant)] hover:bg-[var(--surface)] transition lg:hidden">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        </button>
        <div className="flex-1" />
        <button onClick={onEdit} className="h-8 px-4 text-xs font-medium rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition shadow-sm">编辑</button>
        <button onClick={() => setShowDeleteConfirm(true)} className="h-8 px-4 text-xs font-medium rounded-lg text-[var(--error)] border border-[var(--error)]/20 hover:bg-[var(--error-subtle)] transition">删除</button>
      </div>

      {showDeleteConfirm && (
        <div className="mb-4 p-4 rounded-xl bg-[var(--error-subtle)] border border-[var(--error)]/20 space-y-3">
          <p className="text-sm font-medium">确定要删除 <strong>{credential.platform}</strong> 的账号吗？此操作不可撤销。</p>
          <div className="flex gap-2">
            <button onClick={() => { onDelete(); setShowDeleteConfirm(false); }} className="h-8 px-4 text-xs font-medium rounded-lg bg-[var(--error)] text-white">确认删除</button>
            <button onClick={() => setShowDeleteConfirm(false)} className="h-8 px-4 text-xs rounded-lg border border-[var(--outline)] hover:bg-[var(--surface-variant)] transition">取消</button>
          </div>
        </div>
      )}

      <div className="bg-[var(--surface)] rounded-xl border border-[var(--outline)] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[var(--outline)] flex items-center gap-4">
          <PlatformIcon iconId={credential.platformIcon} name={credential.platform} size={48} />
          <div className="min-w-0">
            <h2 className="text-base font-semibold">{credential.platform}</h2>
            <p className="text-xs text-[var(--on-surface-variant)] truncate">{credential.username}</p>
            {credential.websiteUrl && (
              <a href={credential.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--primary)] hover:underline">
                {credential.websiteUrl.replace(/https?:\/\//, "")}
              </a>
            )}
          </div>
          {credential.tags && (
            <div className="ml-auto flex flex-wrap gap-1">
              {credential.tags.split(",").filter(Boolean).map((tag) => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--primary-subtle)] text-[var(--primary)] font-medium">{tag}</span>
              ))}
            </div>
          )}
        </div>

        {/* Fields */}
        <div className="divide-y divide-[var(--outline)]">
          <FieldRow label="登录方式" value={credential.loginMethod} />

          {credential.loginMethod === "OAuth" && linked && (
            <div className="px-6 py-4">
              <p className="text-xs text-[var(--on-surface-variant)] mb-2">绑定账号</p>
              <button onClick={() => onNavigate(linked.id)} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-variant)] hover:bg-[var(--outline)] transition w-full text-left border border-[var(--outline)]">
                <PlatformIcon iconId={linked.platformIcon} name={linked.platform} size={28} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{linked.platform}</p>
                  <p className="text-xs text-[var(--on-surface-variant)]">{linked.username}</p>
                </div>
                <svg className="w-4 h-4 text-[var(--on-surface-variant)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </button>
            </div>
          )}

          {credential.loginMethod !== "OAuth" && (
            <>
              <CopyRow label="用户名" value={credential.username} onCopy={() => copy("用户名", credential.username)} copied={copied === "用户名"} />
              {credential.password && (
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-[var(--on-surface-variant)]">密码</p>
                    <div className="flex gap-1.5">
                      <button onClick={() => setShowPassword(!showPassword)} className="text-[11px] h-6 px-2 rounded text-[var(--on-surface-variant)] hover:bg-[var(--surface-variant)] transition border border-[var(--outline)]">
                        {showPassword ? "隐藏" : "显示"}
                      </button>
                      <button onClick={() => copy("密码", credential.password)} className="text-[11px] h-6 px-2 rounded bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition">
                        {copied === "密码" ? "已复制" : "复制"}
                      </button>
                    </div>
                  </div>
                  <p className="font-mono text-sm tracking-wider">{showPassword ? credential.password : "•".repeat(Math.min(credential.password.length, 16))}</p>
                </div>
              )}
            </>
          )}

          {credential.verifyMethod !== "None" && credential.verifyMethod && (
            <>
              <FieldRow label="验证方式" value={credential.verifyMethod} />
              {credential.verifyMethod === "2FA" && credential.otpSecret && (
                <CopyRow label="2FA 密钥" value={credential.otpSecret} onCopy={() => copy("2FA", credential.otpSecret)} copied={copied === "2FA"} />
              )}
            </>
          )}

          {credential.note && (
            <div className="px-6 py-4">
              <p className="text-xs text-[var(--on-surface-variant)] mb-1.5">备注</p>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{credential.note}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Edit Form ─── */

const PRESET_TAGS = ["工作", "个人", "金融", "社交", "开发", "游戏", "购物"];

function generatePassword(length = 20): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const symbols = "!@#$%^&*_+-=";
  const all = upper + lower + digits + symbols;
  const arr = new Uint8Array(length);
  globalThis.crypto.getRandomValues(arr);
  const must = [upper[arr[0] % upper.length], lower[arr[1] % lower.length], digits[arr[2] % digits.length], symbols[arr[3] % symbols.length]];
  const rest = Array.from(arr.slice(4), (b) => all[b % all.length]);
  const combined = [...must, ...rest];
  for (let i = combined.length - 1; i > 0; i--) {
    const j = arr[i % arr.length] % (i + 1);
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }
  return combined.join("");
}

function EditForm({ credential, allCredentials, onSave, onCancel }: {
  credential?: Credential;
  allCredentials: Credential[];
  onSave: (c: Credential) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Credential>(credential || {
    id: crypto.randomUUID(), platform: "", username: "", password: "", platformIcon: "", websiteUrl: "",
    loginMethod: "Password", verifyMethod: "None", otpSecret: "", linkedAccountId: "",
    note: "", tags: "", accessCount: 0, updatedAt: Date.now(),
  });
  const [showPlatformPicker, setShowPlatformPicker] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);

  const update = (field: keyof Credential, value: string | number) => setForm((p) => ({ ...p, [field]: value, updatedAt: Date.now() }));

  const selectPlatform = (preset: typeof platformPresets[number]) => {
    setForm((p) => ({ ...p, platform: preset.name, platformIcon: preset.id, websiteUrl: preset.url || p.websiteUrl, updatedAt: Date.now() }));
    setShowPlatformPicker(false);
  };

  const selectedTags = form.tags ? form.tags.split(",").filter(Boolean) : [];
  const toggleTag = (tag: string) => {
    const next = selectedTags.includes(tag) ? selectedTags.filter((t) => t !== tag) : [...selectedTags, tag];
    update("tags", next.join(","));
  };

  const linkedAccount = form.linkedAccountId ? allCredentials.find((c) => c.id === form.linkedAccountId) : null;
  const linkableAccounts = allCredentials.filter((c) => c.id !== form.id && c.loginMethod !== "OAuth");

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancel} className="p-1.5 rounded-lg text-[var(--on-surface-variant)] hover:bg-[var(--surface)] transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h2 className="text-sm font-semibold">{credential ? "编辑账号" : "添加账号"}</h2>
        <div className="flex-1" />
        <button onClick={onCancel} className="h-8 px-4 text-xs font-medium rounded-lg border border-[var(--outline)] hover:bg-[var(--surface-variant)] transition">
          取消
        </button>
        <button onClick={() => onSave(form)} disabled={!form.platform || (!form.username && form.loginMethod !== "OAuth")} className="h-8 px-4 text-xs font-medium rounded-lg bg-[var(--primary)] text-white disabled:opacity-40 hover:bg-[var(--primary-hover)] transition shadow-sm">
          {credential ? "保存" : "创建"}
        </button>
      </div>

      <div className="space-y-6">
        {/* Platform */}
        <FormSection title="平台信息">
          {form.platformIcon && (
            <div className="flex items-center gap-3 mb-3 p-3 rounded-lg bg-[var(--surface-variant)] border border-[var(--outline)]">
              <PlatformIcon iconId={form.platformIcon} name={form.platform} size={32} />
              <span className="text-sm font-medium flex-1">{form.platform}</span>
              <button onClick={() => { update("platformIcon", ""); update("platform", ""); }} className="text-xs px-2.5 py-1 rounded-md text-[var(--on-surface-variant)] hover:bg-[var(--outline)] border border-[var(--outline)] transition">清除</button>
            </div>
          )}
          <button onClick={() => setShowPlatformPicker(!showPlatformPicker)} className="w-full h-9 text-xs font-medium rounded-lg border border-dashed border-[var(--outline)] text-[var(--on-surface-variant)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition">
            {showPlatformPicker ? "收起" : "从预设中选择平台"}
          </button>
          {showPlatformPicker && (
            <div className="mt-3 grid grid-cols-5 sm:grid-cols-7 gap-1.5 max-h-56 overflow-y-auto p-3 rounded-lg border border-[var(--outline)] bg-[var(--surface-variant)]">
              {platformPresets.map((p) => {
                const Icon = p.icon;
                return (
                  <button key={p.id} onClick={() => selectPlatform(p)} className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg hover:bg-[var(--surface)] transition" title={p.name}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: p.color + "14" }}>
                      {Icon ? <Icon size={16} color={p.color} /> : <span style={{ color: p.color, fontWeight: 700, fontSize: 12 }}>{p.name.charAt(0)}</span>}
                    </div>
                    <span className="text-[9px] leading-tight text-center truncate w-full text-[var(--on-surface-variant)]">{p.name}</span>
                  </button>
                );
              })}
            </div>
          )}
          <Input label="平台名称" value={form.platform} onChange={(v) => update("platform", v)} required />
          <Input label="网站 URL" value={form.websiteUrl} onChange={(v) => update("websiteUrl", v)} placeholder="https://example.com" />
        </FormSection>

        {/* Login */}
        <FormSection title="登录信息">
          <div>
            <label className="text-xs font-medium block mb-1.5">登录方式</label>
            <select value={form.loginMethod} onChange={(e) => update("loginMethod", e.target.value)} className="w-full h-9 px-3 text-sm rounded-lg bg-[var(--surface-variant)] border border-[var(--outline)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]">
              <option>Password</option>
              <option>OAuth</option>
              <option>PrivateKey</option>
              <option>SMS</option>
              <option>Other</option>
            </select>
          </div>
          {form.loginMethod === "OAuth" ? (
            <>
              <div>
                <label className="text-xs font-medium block mb-1">绑定账号</label>
                <p className="text-[11px] text-[var(--on-surface-variant)] mb-2">选择通过 OAuth 登录所使用的已有账号</p>
                {linkedAccount ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-variant)] border border-[var(--outline)]">
                    <PlatformIcon iconId={linkedAccount.platformIcon} name={linkedAccount.platform} size={28} />
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{linkedAccount.platform}</p><p className="text-xs text-[var(--on-surface-variant)]">{linkedAccount.username}</p></div>
                    <button onClick={() => update("linkedAccountId", "")} className="text-xs px-2 py-1 rounded-md hover:bg-[var(--outline)] border border-[var(--outline)] transition">解除</button>
                  </div>
                ) : (
                  <button onClick={() => setShowAccountPicker(!showAccountPicker)} className="w-full h-9 text-xs rounded-lg border border-dashed border-[var(--outline)] hover:border-[var(--primary)] transition">点击选择绑定账号</button>
                )}
                {showAccountPicker && !linkedAccount && (
                  <div className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-[var(--outline)] bg-[var(--surface-variant)] divide-y divide-[var(--outline)]">
                    {linkableAccounts.length === 0 ? (
                      <p className="text-center py-6 text-xs text-[var(--on-surface-variant)]">暂无可绑定的账号</p>
                    ) : linkableAccounts.map((acc) => (
                      <button key={acc.id} onClick={() => { update("linkedAccountId", acc.id); setShowAccountPicker(false); }} className="w-full flex items-center gap-3 p-3 hover:bg-[var(--surface)] transition text-left">
                        <PlatformIcon iconId={acc.platformIcon} name={acc.platform} size={28} />
                        <div className="min-w-0"><p className="text-sm font-medium truncate">{acc.platform}</p><p className="text-xs text-[var(--on-surface-variant)]">{acc.username}</p></div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Input label="关联标识（选填）" value={form.username} onChange={(v) => update("username", v)} placeholder="OAuth 显示的邮箱或用户名" />
            </>
          ) : (
            <>
              <Input label="用户名 / 邮箱" value={form.username} onChange={(v) => update("username", v)} required />
              <div>
                <label className="text-xs font-medium block mb-1.5">密码</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => update("password", e.target.value)} placeholder="输入密码" className="w-full h-9 px-3 pr-16 text-sm rounded-lg bg-[var(--surface-variant)] border border-[var(--outline)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
                  <button onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] px-2 py-0.5 rounded text-[var(--on-surface-variant)] hover:bg-[var(--outline)] transition">
                    {showPassword ? "隐藏" : "显示"}
                  </button>
                </div>
                <button onClick={() => update("password", generatePassword())} className="mt-2 text-xs font-medium text-[var(--primary)] hover:underline">
                  生成强密码
                </button>
              </div>
            </>
          )}
        </FormSection>

        {/* Tags */}
        <FormSection title="标签">
          <div className="flex flex-wrap gap-1.5">
            {PRESET_TAGS.map((tag) => (
              <button key={tag} onClick={() => toggleTag(tag)} className={`h-7 px-3 text-xs font-medium rounded-full border transition ${selectedTags.includes(tag) ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-[var(--outline)] text-[var(--on-surface-variant)] hover:border-[var(--primary)] hover:text-[var(--primary)]"}`}>
                {tag}
              </button>
            ))}
          </div>
        </FormSection>

        {/* Security */}
        <FormSection title="安全设置">
          <div>
            <label className="text-xs font-medium block mb-1.5">验证方式</label>
            <select value={form.verifyMethod} onChange={(e) => update("verifyMethod", e.target.value)} className="w-full h-9 px-3 text-sm rounded-lg bg-[var(--surface-variant)] border border-[var(--outline)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]">
              <option value="None">无</option>
              <option value="2FA">2FA（TOTP）</option>
              <option value="SMS">短信验证</option>
              <option value="Email">邮箱验证</option>
              <option value="HardwareKey">硬件密钥</option>
            </select>
          </div>
          {form.verifyMethod === "2FA" && (
            <Input label="2FA 密钥" value={form.otpSecret} onChange={(v) => update("otpSecret", v)} placeholder="TOTP 密钥或备份码" />
          )}
        </FormSection>

        {/* Notes */}
        <FormSection title="备注">
          <div>
            <textarea
              value={form.note}
              onChange={(e) => update("note", e.target.value)}
              placeholder="添加备注或恢复码..."
              className="w-full px-3 py-2.5 text-sm rounded-lg bg-[var(--surface-variant)] border border-[var(--outline)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition min-h-[80px] resize-y"
            />
          </div>
        </FormSection>
      </div>
    </div>
  );
}

/* ─── Shared Components ─── */

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--surface)] rounded-xl border border-[var(--outline)] overflow-hidden">
      <div className="px-6 py-3 border-b border-[var(--outline)] bg-[var(--surface-variant)]">
        <p className="text-[11px] font-semibold text-[var(--on-surface-variant)] uppercase tracking-widest">{title}</p>
      </div>
      <div className="px-6 py-4 space-y-3">{children}</div>
    </div>
  );
}

function PlatformIcon({ iconId, name, size }: { iconId: string; name: string; size: number }) {
  const color = getPlatformColor(iconId, name);
  const preset = getPlatformPreset(iconId, name);
  const IconComponent = preset?.icon;
  const iconSize = Math.round(size * 0.5);
  return (
    <div className="rounded-xl flex items-center justify-center shrink-0" style={{ width: size, height: size, backgroundColor: color + "14" }}>
      {IconComponent ? (
        <IconComponent size={iconSize} color={color} />
      ) : (
        <span style={{ color, fontSize: size * 0.38, fontWeight: 700 }}>{(name.charAt(0) || "?").toUpperCase()}</span>
      )}
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-6 py-4">
      <p className="text-xs text-[var(--on-surface-variant)] mb-0.5">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function CopyRow({ label, value, onCopy, copied }: { label: string; value: string; onCopy: () => void; copied: boolean }) {
  return (
    <div className="px-6 py-4 flex items-center justify-between">
      <div className="min-w-0 mr-3">
        <p className="text-xs text-[var(--on-surface-variant)] mb-0.5">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
      <button onClick={onCopy} className="text-[11px] h-6 px-2.5 rounded bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition shrink-0">
        {copied ? "已复制" : "复制"}
      </button>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type, required }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; required?: boolean;
}) {
  return (
    <div>
      {label && <label className="text-xs font-medium block mb-1.5">{label}{required && <span className="text-[var(--error)] ml-0.5">*</span>}</label>}
      <input
        type={type || "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 px-3 text-sm rounded-lg bg-[var(--surface-variant)] border border-[var(--outline)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition"
      />
    </div>
  );
}
