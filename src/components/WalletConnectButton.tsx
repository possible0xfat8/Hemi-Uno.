import React, { useState } from 'react';
import {
  WalletState,
  formatAddress,
  isHemiChain,
  getHemiNetworkInfo,
} from '../utils/wallet';
import {
  Wallet,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  LogOut,
  Zap,
} from 'lucide-react';

interface WalletConnectButtonProps {
  wallet: WalletState;
  onConnect: () => Promise<void>;
  onDisconnect: () => void;
  onSwitchNetwork?: () => Promise<void>;
  compact?: boolean;
}

export const WalletConnectButton: React.FC<WalletConnectButtonProps> = ({
  wallet,
  onConnect,
  onDisconnect,
  onSwitchNetwork,
  compact = false,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const networkInfo = getHemiNetworkInfo(wallet.chainId);
  const isHemi = networkInfo.isHemi;

  if (!wallet.address) {
    return (
      <div className="relative">
        <button
          onClick={() => onConnect()}
          disabled={wallet.isConnecting}
          className={`
            px-3.5 py-1.5 rounded-xl font-bold text-xs tracking-wider uppercase transition-all duration-200
            flex items-center gap-2 cursor-pointer shadow-md select-none
            ${wallet.isConnecting
              ? 'bg-slate-800 text-slate-400 cursor-wait'
              : 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 hover:brightness-110 active:scale-95 shadow-amber-500/20'}
          `}
          title="Connect Web3 Wallet (MetaMask, OKX, Rabby, Zerion)"
        >
          <Wallet className="w-4 h-4" />
          <span>{wallet.isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
        </button>

        {wallet.error && (
          <div className="absolute right-0 top-full mt-2 w-64 p-2.5 rounded-xl bg-rose-950/90 border border-rose-500/50 text-rose-200 text-[11px] shadow-xl z-50 animate-in fade-in">
            <div className="flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
              <div>{wallet.error}</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Connected state
  return (
    <div className="relative">
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="px-3 py-1.5 rounded-2xl bg-[#111620] border border-slate-800 hover:border-slate-700 transition-all flex items-center gap-2 text-xs select-none shadow-sm cursor-pointer"
      >
        {/* Orange Wallet Icon */}
        <div className="w-6 h-6 rounded-lg bg-[#FF4600]/15 border border-[#FF4600]/30 flex items-center justify-center text-[#FF4600] shrink-0">
          <Wallet className="w-3.5 h-3.5" />
        </div>

        {/* Text Details */}
        <div className="flex flex-col text-left leading-tight hidden sm:flex">
          <span className="font-black text-white text-[11px]">Hemi Wallet</span>
          <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Connected
          </span>
        </div>

        {/* Truncated Address */}
        <span className="font-mono text-xs font-bold text-slate-300 ml-1">
          {formatAddress(wallet.address)}
        </span>

        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {/* Dropdown Menu */}
      {dropdownOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setDropdownOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-72 p-3.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl z-50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
            {/* Header / Network */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">
                    {networkInfo.name}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Chain ID: {wallet.chainId || 'Unknown'}
                  </div>
                </div>
              </div>

              {!isHemi && onSwitchNetwork && (
                <button
                  onClick={() => {
                    onSwitchNetwork();
                    setDropdownOpen(false);
                  }}
                  className="px-2 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold text-[10px] hover:bg-amber-400 transition-colors"
                >
                  Switch to Hemi
                </button>
              )}
            </div>

            {/* Address & Copy */}
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 mb-3">
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">
                Connected Address
              </div>
              <div className="text-xs font-mono text-slate-200 break-all select-all">
                {wallet.address}
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800 text-[11px]">
                <span className="text-slate-400">Balance:</span>
                <span className="font-mono font-bold text-amber-400">
                  {wallet.balance ? `${wallet.balance} ETH` : 'Fetching...'}
                </span>
              </div>
            </div>

            {/* Links & Disconnect */}
            <div className="space-y-1.5 text-xs">
              <a
                href={`${networkInfo.explorerUrl}/address/${wallet.address}`}
                target="_blank"
                rel="noreferrer"
                className="w-full p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-between transition-colors"
              >
                <span>View on Explorer</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </a>

              <button
                onClick={() => {
                  onDisconnect();
                  setDropdownOpen(false);
                }}
                className="w-full p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>Disconnect</span>
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
