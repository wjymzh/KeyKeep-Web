"use client";

import { useState, useEffect, useCallback } from "react";
import { Credential, decryptData, encryptData } from "@/lib/crypto";
import { store } from "@/lib/store";
import { getPlatformColor, getPlatformPreset, platformPresets } from "@/lib/platforms";

type View = "unlock" | "list" | "detail" | "edit" | "add";

export default function Home() {
  const [view, setView] = useState<View>("unlock");
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState("");
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const unsub = store.subscribe(() => {
      setCredentials([...store.getAll()]);
    });
    return unsub;
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
      setView("list");
      setError("");
    } catch {
      setError("解密失败，请检查密钥是否正确");
    }
  }, []);

  const handleExport = useCallback(async () => {
    const pass = store.getPassphrase();
    if (!pass) return;
    const encrypted = await encryptData(store.getAll(), pass);
    const blob = new Blob([encrypted], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "keykeep_backup.keykeep";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const filtered = searchQuery
    ? store.search(searchQuery)
    : credentials;

  if (view === "unlock") {
    return (
      <UnlockScreen
        passphrase={passphrase}
        setPassphrase={setPassphrase}
        error={error}
        onImport={handleFileImport}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />
    );
  }

  const selected = selectedId ? store.getById(selectedId) : null;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="KeyKeep" className="w-9 h-9" />
          <h1 className="text-xl font-bold">KeyKeep</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-lg hover:bg-[var(--surface-variant)] transition">
            {darkMode ? "☀️" : "🌙"}
          </button>
          <button onClick={handleExport} className="px-3 py-2 text-sm rounded-lg bg-[var(--surface-variant)] hover:bg-[var(--outline)] transition">
            导出
          </button>
          <button onClick={() => setView("add")} className="px-3 py-2 text-sm rounded-lg bg-[var(--primary)] text-white hover:opacity-90 transition">
            + 添加
          </button>
        </div>
      </header>

      {view === "list" && (
        <VaultList
          credentials={filtered}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSelect={(id) => { setSelectedId(id); setView("detail"); }}
        />
      )}

      {view === "detail" && selected && (
        <DetailView
          credential={selected}
          allCredentials={credentials}
          onBack={() => setView("list")}
          onEdit={() => setView("edit")}
          onDelete={() => { store.remove(selected.id); setView("list"); }}
          onNavigate={(id) => { setSelectedId(id); }}
        />
      )}

      {view === "edit" && selected && (
        <EditForm
          credential={selected}
          onSave={(c) => { store.update(c); setView("detail"); }}
          onCancel={() => setView("detail")}
        />
      )}

      {view === "add" && (
        <EditForm
          onSave={(c) => { store.add(c); setView("list"); }}
          onCancel={() => setView("list")}
        />
      )}
    </div>
  );
}

function UnlockScreen({ passphrase, setPassphrase, error, onImport, darkMode, setDarkMode }: {
  passphrase: string;
  setPassphrase: (v: string) => void;
  error: string;
  onImport: (file: File, pass: string) => void;
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
}) {
  const [file, setFile] = useState<File | null>(null);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="KeyKeep" className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">KeyKeep</h1>
          <p className="text-[var(--on-surface-variant)] mt-2">导入加密备份文件开始使用</p>
        </div>

        <div className="bg-[var(--surface)] rounded-2xl p-6 shadow-sm border border-[var(--outline)]">
          <label className="block mb-4">
            <span className="text-sm font-medium mb-2 block">选择 .keykeep 文件</span>
            <input
              type="file"
              accept=".keykeep,.json"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[var(--primary)] file:text-white file:cursor-pointer hover:file:opacity-90"
            />
          </label>

          <label className="block mb-4">
            <span className="text-sm font-medium mb-2 block">解密密钥</span>
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="输入导出时设置的密钥"
              className="w-full px-4 py-3 rounded-xl bg-[var(--surface-variant)] border border-[var(--outline)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </label>

          {error && <p className="text-[var(--error)] text-sm mb-4">{error}</p>}

          <button
            onClick={() => file && passphrase && onImport(file, passphrase)}
            disabled={!file || !passphrase}
            className="w-full py-3 rounded-xl bg-[var(--primary)] text-white font-medium disabled:opacity-50 hover:opacity-90 transition"
          >
            解密并导入
          </button>
        </div>

        <div className="text-center mt-4">
          <button onClick={() => setDarkMode(!darkMode)} className="text-sm text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]">
            {darkMode ? "切换浅色模式" : "切换深色模式"}
          </button>
        </div>
      </div>
    </div>
  );
}

function VaultList({ credentials, searchQuery, setSearchQuery, onSelect }: {
  credentials: Credential[];
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <div className="relative mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索平台、用户名..."
          className="w-full px-4 py-3 pl-10 rounded-xl bg-[var(--surface)] border border-[var(--outline)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        />
        <svg className="absolute left-3 top-3.5 w-4 h-4 text-[var(--on-surface-variant)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <p className="text-sm text-[var(--on-surface-variant)] mb-3">{credentials.length} 个账号</p>

      {credentials.length === 0 ? (
        <div className="text-center py-16 text-[var(--on-surface-variant)]">
          <p className="text-lg">暂无数据</p>
        </div>
      ) : (
        <div className="space-y-2">
          {credentials.map((cred) => (
            <button
              key={cred.id}
              onClick={() => onSelect(cred.id)}
              className="w-full flex items-center gap-3 p-4 rounded-xl bg-[var(--surface)] border border-[var(--outline)] hover:border-[var(--primary)] transition text-left"
            >
              <PlatformIcon iconId={cred.platformIcon} name={cred.platform} size={40} />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{cred.platform}</p>
                <p className="text-sm text-[var(--on-surface-variant)] truncate">{cred.username}</p>
              </div>
              {cred.websiteUrl && (
                <span className="text-xs text-[var(--on-surface-variant)] hidden sm:block truncate max-w-32">{cred.websiteUrl.replace(/https?:\/\//, "")}</span>
              )}
              <svg className="w-4 h-4 text-[var(--on-surface-variant)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
  const linked = credential.linkedAccountId ? allCredentials.find((c) => c.id === credential.linkedAccountId) : null;

  const copy = (label: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-[var(--surface-variant)]">←</button>
        <div className="flex-1" />
        <button onClick={onEdit} className="px-3 py-2 text-sm rounded-lg bg-[var(--primary)] text-white">编辑</button>
        <button onClick={onDelete} className="px-3 py-2 text-sm rounded-lg bg-[var(--error)] text-white">删除</button>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <PlatformIcon iconId={credential.platformIcon} name={credential.platform} size={56} />
        <div>
          <h2 className="text-2xl font-bold">{credential.platform}</h2>
          <p className="text-[var(--on-surface-variant)]">{credential.username}</p>
          {credential.websiteUrl && (
            <a href={credential.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--primary)] underline">
              {credential.websiteUrl}
            </a>
          )}
        </div>
      </div>

      <div className="bg-[var(--surface)] rounded-2xl p-5 border border-[var(--outline)] space-y-4">
        <InfoRow label="登录方式" value={credential.loginMethod} />

        {credential.loginMethod === "OAuth" && linked && (
          <div>
            <p className="text-sm text-[var(--on-surface-variant)] mb-1">绑定账号</p>
            <button onClick={() => onNavigate(linked.id)} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--surface-variant)] hover:bg-[var(--outline)] transition w-full text-left">
              <PlatformIcon iconId={linked.platformIcon} name={linked.platform} size={28} />
              <span className="font-medium text-sm">{linked.platform}</span>
              <span className="text-xs text-[var(--on-surface-variant)]">{linked.username}</span>
              <svg className="w-4 h-4 ml-auto text-[var(--on-surface-variant)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        {credential.loginMethod !== "OAuth" && (
          <>
            <CopyRow label="用户名" value={credential.username} onCopy={() => copy("用户名", credential.username)} copied={copied === "用户名"} />
            {credential.password && (
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[var(--on-surface-variant)]">密码</p>
                  <div className="flex gap-1">
                    <button onClick={() => setShowPassword(!showPassword)} className="text-xs px-2 py-1 rounded bg-[var(--surface-variant)]">
                      {showPassword ? "隐藏" : "显示"}
                    </button>
                    <button onClick={() => copy("密码", credential.password)} className="text-xs px-2 py-1 rounded bg-[var(--primary)] text-white">
                      {copied === "密码" ? "已复制" : "复制"}
                    </button>
                  </div>
                </div>
                <p className="font-mono mt-1">{showPassword ? credential.password : "•".repeat(Math.min(credential.password.length, 16))}</p>
              </div>
            )}
          </>
        )}

        {credential.verifyMethod !== "None" && credential.verifyMethod && (
          <InfoRow label="二次验证" value={credential.verifyMethod} />
        )}

        {credential.tags && (
          <div>
            <p className="text-sm text-[var(--on-surface-variant)] mb-1">标签</p>
            <div className="flex flex-wrap gap-1">
              {credential.tags.split(",").map((tag) => (
                <span key={tag} className="px-2 py-0.5 text-xs rounded-full bg-[var(--primary)] bg-opacity-10 text-[var(--primary)]">{tag}</span>
              ))}
            </div>
          </div>
        )}

        {credential.note && (
          <div>
            <p className="text-sm text-[var(--on-surface-variant)] mb-1">备注</p>
            <p className="text-sm whitespace-pre-wrap">{credential.note}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function EditForm({ credential, onSave, onCancel }: {
  credential?: Credential;
  onSave: (c: Credential) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Credential>(credential || {
    id: crypto.randomUUID(),
    platform: "",
    username: "",
    password: "",
    platformIcon: "",
    websiteUrl: "",
    loginMethod: "Password",
    verifyMethod: "None",
    otpSecret: "",
    linkedAccountId: "",
    note: "",
    tags: "",
    accessCount: 0,
    updatedAt: Date.now(),
  });
  const [showPlatformPicker, setShowPlatformPicker] = useState(false);

  const update = (field: keyof Credential, value: string | number) => {
    setForm({ ...form, [field]: value, updatedAt: Date.now() });
  };

  const selectPlatform = (preset: typeof platformPresets[number]) => {
    setForm({
      ...form,
      platform: preset.name,
      platformIcon: preset.id,
      websiteUrl: form.websiteUrl || preset.url,
      updatedAt: Date.now(),
    });
    setShowPlatformPicker(false);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <button onClick={onCancel} className="p-2 rounded-lg hover:bg-[var(--surface-variant)]">←</button>
        <h2 className="text-lg font-bold">{credential ? "编辑" : "添加"}账号</h2>
      </div>

      <div className="bg-[var(--surface)] rounded-2xl p-5 border border-[var(--outline)] space-y-4">
        {/* 平台选择 */}
        <div>
          <label className="text-sm font-medium block mb-2">选择平台</label>
          {form.platformIcon && (
            <div className="flex items-center gap-2 mb-2 p-2 rounded-lg bg-[var(--surface-variant)]">
              <PlatformIcon iconId={form.platformIcon} name={form.platform} size={32} />
              <span className="font-medium text-sm">{form.platform}</span>
              <button onClick={() => { update("platformIcon", ""); update("platform", ""); }} className="ml-auto text-xs px-2 py-1 rounded bg-[var(--outline)] hover:opacity-80">
                清除
              </button>
            </div>
          )}
          <button
            onClick={() => setShowPlatformPicker(!showPlatformPicker)}
            className="w-full py-2 text-sm rounded-lg border border-dashed border-[var(--outline)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition"
          >
            {showPlatformPicker ? "收起" : "从预设中选择平台..."}
          </button>
          {showPlatformPicker && (
            <div className="mt-2 grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-64 overflow-y-auto p-2 rounded-lg border border-[var(--outline)] bg-[var(--surface-variant)]">
              {platformPresets.map((p) => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.id}
                    onClick={() => selectPlatform(p)}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-[var(--surface)] transition"
                    title={p.name}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: p.color + "14" }}
                    >
                      {Icon ? <Icon size={18} color={p.color} /> : <span style={{ color: p.color, fontWeight: 700, fontSize: 14 }}>{p.name.charAt(0)}</span>}
                    </div>
                    <span className="text-[10px] leading-tight text-center truncate w-full">{p.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <FormField label="平台名称" value={form.platform} onChange={(v) => update("platform", v)} required />
        <FormField label="网站 URL" value={form.websiteUrl} onChange={(v) => update("websiteUrl", v)} placeholder="https://example.com" />
        <FormField label="用户名 / 邮箱" value={form.username} onChange={(v) => update("username", v)} required />
        <FormField label="密码" value={form.password} onChange={(v) => update("password", v)} type="password" />

        <div>
          <label className="text-sm font-medium block mb-1">登录方式</label>
          <select value={form.loginMethod} onChange={(e) => update("loginMethod", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-[var(--surface-variant)] border border-[var(--outline)]">
            <option>Password</option>
            <option>OAuth</option>
            <option>PrivateKey</option>
            <option>SMS</option>
            <option>Other</option>
          </select>
        </div>

        <FormField label="标签（逗号分隔）" value={form.tags} onChange={(v) => update("tags", v)} placeholder="工作,个人" />
        <FormField label="备注" value={form.note} onChange={(v) => update("note", v)} multiline />

        <div className="flex gap-3 pt-2">
          <button onClick={() => onSave(form)} disabled={!form.platform || !form.username} className="flex-1 py-3 rounded-xl bg-[var(--primary)] text-white font-medium disabled:opacity-50">
            保存
          </button>
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl border border-[var(--outline)]">
            取消
          </button>
        </div>
      </div>
    </div>
  );
}

// Shared components

function PlatformIcon({ iconId, name, size }: { iconId: string; name: string; size: number }) {
  const color = getPlatformColor(iconId, name);
  const preset = getPlatformPreset(iconId, name);
  const IconComponent = preset?.icon;
  const letter = name.charAt(0).toUpperCase();
  const iconSize = Math.round(size * 0.5);

  return (
    <div
      className="rounded-xl flex items-center justify-center shrink-0"
      style={{ width: size, height: size, backgroundColor: color + "14" }}
    >
      {IconComponent ? (
        <IconComponent size={iconSize} color={color} />
      ) : (
        <span style={{ color, fontSize: size * 0.4, fontWeight: 700 }}>{letter}</span>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-[var(--on-surface-variant)]">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function CopyRow({ label, value, onCopy, copied }: { label: string; value: string; onCopy: () => void; copied: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-[var(--on-surface-variant)]">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
      <button onClick={onCopy} className="text-xs px-2 py-1 rounded bg-[var(--primary)] text-white">
        {copied ? "已复制" : "复制"}
      </button>
    </div>
  );
}

function FormField({ label, value, onChange, placeholder, type, required, multiline }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  multiline?: boolean;
}) {
  const cls = "w-full px-3 py-2 rounded-lg bg-[var(--surface-variant)] border border-[var(--outline)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]";
  return (
    <div>
      <label className="text-sm font-medium block mb-1">{label}{required && <span className="text-[var(--error)]">*</span>}</label>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cls + " min-h-[80px] resize-y"} />
      ) : (
        <input type={type || "text"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cls} />
      )}
    </div>
  );
}
