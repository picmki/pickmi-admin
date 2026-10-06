import React from "react";
import {
  Radio,
  LayoutDashboard,
  Navigation,
  MapPin,
  Users,
  UserCheck,
  FileCheck2,
  ShieldCheck,
  Database,
  Receipt,
  Wallet,
  X,
} from "lucide-react";
import type { NavTab } from "../types";

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  pendingDocCount: number;
  onlineDriverCount: number;
  activeTripCount: number;
  pendingSettlementCount?: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  pendingDocCount,
  onlineDriverCount,
  activeTripCount,
  pendingSettlementCount = 0,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const navItems = [
    {
      id: "overview" as NavTab,
      label: "Dashboard Overview",
      icon: LayoutDashboard,
    },
    {
      id: "create-trip" as NavTab,
      label: "Create & Dispatch Trip",
      icon: Navigation,
      highlight: true,
    },
    {
      id: "live-drivers" as NavTab,
      label: "Live Drivers Map",
      icon: Radio,
      badge: onlineDriverCount > 0 ? `${onlineDriverCount} Live` : undefined,
      badgeColor: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    },
    {
      id: "trips" as NavTab,
      label: "Trips & Fleet Live",
      icon: MapPin,
      badge: activeTripCount > 0 ? activeTripCount : undefined,
      badgeColor: "bg-blue-50 text-[#0043DC] border border-blue-200",
    },
    {
      id: "billing" as NavTab,
      label: "Billing & Settlements",
      icon: Receipt,
      badge: pendingSettlementCount > 0 ? `${pendingSettlementCount} Due` : undefined,
      badgeColor: "bg-amber-50 text-amber-700 border border-amber-200",
    },
    {
      id: "driver-wallets" as NavTab,
      label: "Driver Wallets & Penalties",
      icon: Wallet,
      highlight: true,
    },
    {
      id: "drivers" as NavTab,
      label: "Drivers & Telemetry",
      icon: Users,
      badge: onlineDriverCount > 0 ? `${onlineDriverCount} Live` : undefined,
      badgeColor: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    },
    {
      id: "customers" as NavTab,
      label: "Customer CRM",
      icon: UserCheck,
    },
    {
      id: "documents" as NavTab,
      label: "Doc Verifications",
      icon: FileCheck2,
      badge: pendingDocCount > 0 ? pendingDocCount : undefined,
      badgeColor: "bg-amber-50 text-amber-700 border border-amber-200",
    },
    {
      id: "deposits" as NavTab,
      label: "Security Deposits",
      icon: ShieldCheck,
      sublabel: "₹250 / year",
    },
    {
      id: "schema" as NavTab,
      label: "Supabase SQL Setup",
      icon: Database,
    },
  ];

  const handleNavClick = (tab: NavTab) => {
    onSelectTab(tab);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      {/* Main Sidebar Element */}
      <aside
        className={`w-64 fixed inset-y-0 left-0 bg-white border-r border-slate-200 flex flex-col justify-between p-4 z-50 shadow-xl md:shadow-sm transition-transform duration-300 ${
          isOpenMobile ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-100px)] pr-1">
          {/* Brand Header */}
          <div className="flex items-center justify-between px-2 py-1">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-[#0043DC] text-white flex items-center justify-center font-black shadow-md shadow-[#0043DC]/20">
                PM
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-black tracking-tight text-slate-900">PickMi</span>
                  <span className="px-1.5 py-0.5 text-[10px] font-black uppercase bg-[#0043DC]/10 text-[#0043DC] rounded-md">
                    Admin
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">Control Center v2.0</p>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={onCloseMobile}
              className="p-2 text-slate-400 hover:text-slate-700 md:hidden rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-3">
            Fleet Navigation
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id || (item.id === "drivers" && currentTab === "driver-details");

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? "bg-[#0043DC] text-white shadow-md shadow-[#0043DC]/20 font-extrabold"
                      : item.highlight
                      ? "bg-blue-50 text-[#0043DC] hover:bg-blue-100/70 border border-blue-200/50"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? "text-white" : item.highlight ? "text-[#0043DC]" : "text-slate-500"
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {item.badge && (
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-tight ${
                          isActive
                            ? "bg-white/20 text-white"
                            : item.badgeColor || "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    {item.sublabel && !isActive && (
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        {item.sublabel}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Mobile Info Footer */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700">Mobile Responsive</span>
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                Active
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Touch-friendly smartphone view</p>
          </div>
        </div>
      </aside>
    </>
  );
};
