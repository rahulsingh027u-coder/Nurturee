'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/*
 * Patient login — multi-step flow
 *
 * identifier → otp → (new user?) → name → set password → done
 *                       (returning, has pw?) → password login → done
 *                       (returning, no pw?) → set password → done
 *
 * The whole thing is intentionally one file to keep the
 * state machine easy to follow.
 */

type Step = 'identifier' | 'otp' | 'name' | 'set-password' | 'login-password' | 'done';
type IdMode = 'phone' | 'email';

const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
const validPhone = (v: string) => /^[6-9]\d{9}$/.test(v.replace(/\D/g, ''));
const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

/* ── Step transition map (which step goes back to where) ── */
const PREV_STEP: Record<Step, Step | null> = {
  identifier: null,
  otp: 'identifier',
  name: 'otp',
  'set-password': 'name',
  'login-password': 'identifier',
  done: null,
};

export default function PatientLoginPage() {
  const router = useRouter();
  const [returnUrl, setReturnUrl] = useState("/patient");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ret = params.get("return");
    if (ret) setReturnUrl(ret);
  }, []);

  const [step, setStep] = useState<Step>('identifier');
  const [mode, setMode] = useState<IdMode>('phone');
  const [dir, setDir] = useState<1 | -1>(1);
  const [animating, setAnimating] = useState(false);

  const [id, setId] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [loginPw, setLoginPw] = useState('');

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [showPw, setShowPw] = useState(false);
  const [showLoginPw, setShowLoginPw] = useState(false);

  const otpRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const pwRef = useRef<HTMLInputElement>(null);

  /* auto-focus the right field on step change */
  useEffect(() => {
    const refs: Partial<Record<Step, HTMLInputElement | null>> = {
      otp: otpRef.current,
      name: nameRef.current,
      'set-password': pwRef.current,
    };
    if (refs[step]) setTimeout(() => refs[step]?.focus(), 280);
  }, [step]);

  /* resend cooldown */
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown(n => n <= 1 ? (clearInterval(t), 0) : n - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  /* animated step transition */
  const go = useCallback(async (to: Step, d: 1 | -1 = 1) => {
    if (animating) return;
    setAnimating(true); setDir(d); setErr('');
    await wait(200); setStep(to); await wait(60); setAnimating(false);
  }, [animating]);

  const maskId = () => {
    const v = id.trim();
    if (mode === 'phone') return '\u2022\u2022\u2022\u2022\u2022\u2022' + v.slice(-4);
    const [u, dm] = v.split('@');
    return u.slice(0, 2) + '\u2022\u2022\u2022@' + dm;
  };

  const slideCls = animating
    ? (dir === 1 ? 'opacity-0 -translate-x-3' : 'opacity-0 translate-x-3')
    : 'opacity-100 translate-x-0';

  /* ── API helper — turns status codes into human messages ── */
  const api = async (url: string, body: Record<string, string>) => {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (res.ok) return data;
    const map: Record<number, string> = {
      401: "That code didn't match. Double-check and try again?",
      410: 'This code has expired. Let us send you a fresh one.',
      429: 'Too many wrong attempts. Please request a new code.',
    };
    throw new Error(data.error || map[res.status] || 'Something went wrong. Please try again.');
  };

  /* ── send OTP ── */
  const sendOtp = async (skipNav = false) => {
    setErr('');
    const v = id.trim();
    if (!v) return setErr(mode === 'phone' ? 'Please enter your mobile number' : 'Please enter your email');
    if (mode === 'phone' && !validPhone(v)) return setErr("That doesn't look like a valid Indian mobile number");
    if (mode === 'email' && !validEmail(v)) return setErr("Hmm, that email doesn't look right. Could you double-check?");
    setBusy(true);
    try {
      const body: Record<string, string> = mode === 'phone' ? { phone: v } : { email: v };
      const d = await api('/patient/api/auth/send-otp', body);
      setOtp(''); setCooldown(60);
      if (!skipNav) await go('otp');
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  /* ── verify OTP ── */
  const verifyOtp = async () => {
    if (otp.length !== 6) return setErr('Please enter the full 6-digit code');
    setBusy(true);
    try {
      const body: Record<string, string> = { otp, name: '', password: '' };
      if (mode === 'phone') body.phone = id.trim(); else body.email = id.trim();
      const d = await api('/patient/api/auth/set-password', { password: pw });
      if (d.isNewUser) return await go('name');
      if (d.hasPassword) return await go('login-password');
      await go('set-password');
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  const onNameNext = async () => {
    if (name.trim().length < 2) return setErr("We'd love to know your name — at least 2 characters!");
    await go('set-password');
  };

  const onPasswordSet = async () => {
    if (pw.length < 6) return setErr('Password should be at least 6 characters');
    if (pw !== pw2) return setErr("Those don't match — could you re-type?");
    setBusy(true);
    try {
      // Set password via dedicated route
      if (mode === 'phone') body.phone = id.trim(); else body.email = id.trim();
      await api('/patient/api/auth/set-password', { password: pw });
      await go('done'); setTimeout(() => router.push(returnUrl), 1400);
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  const onPasswordLogin = async () => {
    if (!loginPw) return setErr('Please enter your password');
    setBusy(true);
    try {
      const body: Record<string, string> = { password: loginPw };
      if (mode === 'phone') body.phone = id.trim(); else body.email = id.trim();
      await api('/patient/api/auth/login-password', body);
      await go('done'); setTimeout(() => router.push(returnUrl), 1400);
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  const goBack = () => { const p = PREV_STEP[step]; if (p) go(p, -1); else router.back(); };

  /* ════════════ tiny UI bits ════════════ */

  const Spin = () => <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>;

  const ErrMsg = () => err ? <p className="text-red-500 text-xs mt-2 flex items-start gap-1.5"><svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>{err}</p> : null;

  const Cta = ({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled} className="w-full mt-5 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-600/25 active:scale-[0.98]">{children}</button>
  );

  const LinkBtn = ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => (
    <button onClick={onClick} className="w-full mt-3 py-2.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">{children}</button>
  );

  const Eye = ({ show, toggle }: { show: boolean; toggle: () => void }) => (
    <button type="button" onClick={toggle} className="text-gray-400 hover:text-gray-600">
      {show
        ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"/></svg>
        : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>}
    </button>
  );

  const Inp = ({ val, set, ph, type = 'text', refEl, onEnter, icon, right, prefix }: {
    val: string; set: (v: string) => void; ph: string; type?: string; refEl?: any; onEnter?: () => void; icon?: React.ReactNode; right?: React.ReactNode; prefix?: string;
  }) => (
    <div className="relative mb-1">
      {icon && <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">{icon}</div>}
      {prefix && <span className="absolute left-12 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium select-none">{prefix}</span>}
      <input ref={refEl} type={type} value={val} onChange={e => { set(e.target.value); setErr(''); }} onKeyDown={e => e.key === 'Enter' && onEnter?.()} placeholder={ph} autoComplete="off"
        className={['w-full py-3.5 bg-gray-50 border-2 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0 transition-colors', err ? 'border-red-300 focus:border-red-500' : 'border-transparent focus:border-blue-500', icon ? 'pl-11' : '', prefix ? 'pl-20' : '', right ? 'pr-11' : 'pr-4'].filter(Boolean).join(' ')} />
      {right && <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{right}</div>}
    </div>
  );

  const Card = ({ children }: { children: React.ReactNode }) => <div className="bg-white rounded-2xl shadow-lg shadow-blue-900/5 p-6">{children}</div>;

  const PhoneIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"/></svg>;
  const MailIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/></svg>;

  /* ════════════ JSX ════════════ */
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50/40 to-white flex flex-col">
      <div className="p-4">
        <button onClick={goBack} className="w-10 h-10 rounded-full bg-white/80 backdrop-blur shadow-sm flex items-center justify-center hover:bg-white transition-colors">
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-10">
        <div className="w-full max-w-sm">
          {/* brand */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25 mb-4">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"/></svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Nurturee</h1>
            <p className="text-gray-500 mt-1 text-sm">Your health, our care</p>
          </div>

          <div className={`transition-all duration-200 ease-out ${slideCls}`}>
            {/* ─── identifier ─── */}
            {step === 'identifier' && (
              <div className="bg-white rounded-2xl shadow-lg shadow-blue-900/5 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Welcome back</h2>
                <p className="text-sm text-gray-500 mb-6">Let's get you signed in. How would you like to continue?</p>
                <div className="flex bg-gray-100 rounded-xl p-1 mb-5">
                  {(['phone', 'email'] as const).map(m => (
                    <button key={m} onClick={() => { setMode(m); setId(''); setErr(''); }}
                      className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                      {m === 'phone' ? 'Mobile' : 'Email'}
                    </button>
                  ))}
                </div>
                <div className="relative mb-1">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">{mode === 'phone' ? <PhoneIcon/> : <MailIcon/>}</div>
                  {mode === 'phone' && <span className="absolute left-12 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium select-none">+91</span>}
                  <input type={mode === 'phone' ? 'tel' : 'email'} value={id} onChange={e => { setId(mode === 'phone' ? e.target.value.replace(/\D/g, '').slice(0, 10) : e.target.value); setErr(''); }} onKeyDown={e => e.key === 'Enter' && sendOtp()} placeholder={mode === 'phone' ? 'Enter 10-digit number' : 'you@example.com'} autoComplete="off" className={['w-full py-3.5 bg-gray-50 border-2 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0 transition-colors', err ? 'border-red-300 focus:border-red-500' : 'border-transparent focus:border-blue-500', 'pl-11', mode === 'phone' ? 'pl-20' : '', 'pr-4'].filter(Boolean).join(' ')} />
                </div>
                <ErrMsg />
                <Cta onClick={() => sendOtp()} disabled={busy || !id.trim()}>{busy ? <span className="flex items-center justify-center gap-2"><Spin/> Sending...</span> : 'Continue'}</Cta>
                <p className="text-center text-xs text-gray-400 mt-5">By continuing, you agree to our <Link href="/patient/terms" className="text-blue-600 hover:underline">Terms</Link> and <Link href="/patient/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link></p>
              </div>
            )}

            {/* ─── OTP ─── */}
            {step === 'otp' && (
              <div className="bg-white rounded-2xl shadow-lg shadow-blue-900/5 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Check your {mode === 'phone' ? 'phone' : 'inbox'}</h2>
                <p className="text-sm text-gray-500 mb-6">We sent a 6-digit code to <span className="font-medium text-gray-700">{maskId()}</span></p>
                <div className="flex justify-center gap-2.5 mb-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <input key={i} ref={i === 0 ? otpRef : undefined} type="text" inputMode="numeric" maxLength={1} value={otp[i] || ''}
                      onChange={e => { const ch = e.target.value.replace(/\D/g, ''); setOtp(otp.slice(0, i) + ch + otp.slice(i + 1)); setErr(''); if (ch && i < 5) (e.target.nextElementSibling as HTMLInputElement)?.focus(); }}
                      onKeyDown={e => { if (e.key === 'Backspace' && !otp[i] && i > 0) (e.target as HTMLInputElement).previousElementSibling?.querySelector('input')?.focus(); if (e.key === 'Enter' && otp.length === 6) verifyOtp(); }}
                      onPaste={e => { e.preventDefault(); const p = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6); setOtp(p); (e.target as HTMLInputElement).parentElement?.children[Math.min(p.length, 5)]?.querySelector('input')?.focus(); }}
                      className={['w-12 h-14 text-center text-xl font-bold rounded-xl border-2 focus:outline-none focus:ring-0 transition-all duration-150', err ? 'border-red-300' : otp[i] ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200'].join(' ')} />
                  ))}
                </div>
                <ErrMsg />
                <div className="text-center mt-4">
                  {cooldown > 0 ? <p className="text-sm text-gray-400">Send again in <span className="font-medium text-gray-600">{cooldown}s</span></p> : <button onClick={() => sendOtp(false)} disabled={busy} className="text-sm text-blue-600 hover:text-blue-700 font-medium">Didn't get it? Send again</button>}
                </div>
                <Cta onClick={verifyOtp} disabled={busy || otp.length !== 6}>{busy ? <span className="flex items-center justify-center gap-2"><Spin/> Verifying...</span> : 'Verify & continue'}</Cta>
                <LinkBtn onClick={() => go('identifier', -1)}>Use a different number</LinkBtn>
              </div>
            )}

            {/* ─── name (new user) ─── */}
            {step === 'name' && (
              <div className="bg-white rounded-2xl shadow-lg shadow-blue-900/5 p-6">
                <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0"/></svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1 text-center">Nice to meet you!</h2>
                <p className="text-sm text-gray-500 mb-6 text-center">What should we call you?</p>
                <Inp val={name} set={setName} ph="Your full name" refEl={nameRef} onEnter={onNameNext} />
                <ErrMsg />
                <Cta onClick={onNameNext} disabled={busy || name.trim().length < 2}>Continue</Cta>
              </div>
            )}

            {/* ─── set password (new user or first-time returning) ─── */}
            {step === 'set-password' && (
              <div className="bg-white rounded-2xl shadow-lg shadow-blue-900/5 p-6">
                <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1 text-center">Set up your password</h2>
                <p className="text-sm text-gray-500 mb-6 text-center">Pick something you'll remember — at least 6 characters</p>
                <Inp val={pw} set={setPw} ph="Create a password" type={showPw ? 'text' : 'password'} refEl={pwRef} right={<Eye show={showPw} toggle={() => setShowPw(!showPw)}/>} />
                <Inp val={pw2} set={setPw2} ph="Confirm your password" type={showPw ? 'text' : 'password'} onEnter={onPasswordSet} />
                <ErrMsg />
                <Cta onClick={onPasswordSet} disabled={busy || !pw || !pw2}>{busy ? <span className="flex items-center justify-center gap-2"><Spin/> Saving...</span> : "All done, take me in!"}</Cta>
              </div>
            )}

            {/* ─── password login (returning user) ─── */}
            {step === 'login-password' && (
              <div className="bg-white rounded-2xl shadow-lg shadow-blue-900/5 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Welcome back!</h2>
                <p className="text-sm text-gray-500 mb-6">Enter your password for <span className="font-medium text-gray-700">{maskId()}</span></p>
                <Inp val={loginPw} set={setLoginPw} ph="Your password" type={showLoginPw ? 'text' : 'password'} onEnter={onPasswordLogin} right={<Eye show={showLoginPw} toggle={() => setShowLoginPw(!showLoginPw)}/>} />
                <ErrMsg />
                <Cta onClick={onPasswordLogin} disabled={busy || !loginPw}>{busy ? <span className="flex items-center justify-center gap-2"><Spin/> Signing in...</span> : 'Sign in'}</Cta>
                <div className="flex items-center gap-3 my-5"><div className="flex-1 h-px bg-gray-200"/><span className="text-xs text-gray-400">or</span><div className="flex-1 h-px bg-gray-200"/></div>
                <button onClick={() => { sendOtp(true); go('otp'); }} className="w-full py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-all active:scale-[0.98]">Login with OTP instead</button>
                <LinkBtn onClick={() => go('identifier', -1)}>Use a different number/email</LinkBtn>
              </div>
            )}

            {/* ─── done ─── */}
            {step === 'done' && (
              <div className="bg-white rounded-2xl shadow-lg shadow-blue-900/5 p-6">
                <div className="text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4 animate-bounce">
                    <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">You're all set!</h2>
                  <p className="text-sm text-gray-500">Taking you to your dashboard...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
