import React, { useState, useEffect } from "react";
import {
  Radio,
  LayoutDashboard,
  MapPin,
  Users,
  FileCheck2,
  ShieldCheck,
  Receipt,
  Car,
  ChevronDown,
  Check,
  X,
  Globe,
  MessageSquare,
} from "lucide-react";
import type { NavTab } from "../types";

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  pendingDocCount?: number;
  onlineDriverCount?: number;
  activeTripCount?: number;
  pendingSettlementCount?: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const [managementMode, setManagementMode] = useState<'driver' | 'customer' | 'website'>(() => {
    if (currentTab === 'website-bookings' || currentTab === 'website-book-cab' || currentTab === 'website-users' || currentTab === 'website-applications' || currentTab === 'website-inquiries' || (currentTab as any) === 'customer-details') {
      return 'website';
    }
    return currentTab === 'customers' ? 'customer' : 'driver';
  });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    if (currentTab === 'customers') {
      setManagementMode('customer');
    } else if (currentTab === 'website-bookings' || currentTab === 'website-book-cab' || currentTab === 'website-users' || currentTab === 'website-applications' || currentTab === 'website-inquiries') {
      setManagementMode('website');
    }
  }, [currentTab]);

  // Driver Management Navigation Items (Counts removed)
  const driverNavItems = [
    {
      id: "overview" as NavTab,
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "live-drivers" as NavTab,
      label: "Live Drivers",
      icon: Radio,
    },
    {
      id: "trips" as NavTab,
      label: "Trip Management",
      icon: MapPin,
    },
    {
      id: "drivers" as NavTab,
      label: "Drivers",
      icon: Users,
    },
    {
      id: "billing" as NavTab,
      label: "Billing",
      icon: Receipt,
    },
    {
      id: "deposits" as NavTab,
      label: "Security",
      icon: ShieldCheck,
    },
    {
      id: "documents" as NavTab,
      label: "Pending Documents",
      icon: FileCheck2,
    },
  ];

  // Customer Management Navigation Items
  // Customer Management Navigation Items
  const customerNavItems = [
    {
      id: "customers" as NavTab,
      label: "Customer List",
      icon: Users,
    },
  ];

  // Website Management Navigation Items
  const websiteNavItems = [
    {
      id: "website-bookings" as NavTab,
      label: "Website Bookings",
      icon: Globe,
    },
    {
      id: "website-book-cab" as NavTab,
      label: "Book a Cab",
      icon: Car,
    },
    {
      id: "website-users" as NavTab,
      label: "Website Customers",
      icon: Users,
    },
    {
      id: "website-applications" as NavTab,
      label: "Driver Applications",
      icon: Car,
    },
    {
      id: "website-inquiries" as NavTab,
      label: "Support Inquiries",
      icon: MessageSquare,
    },
  ];

  const navItems = managementMode === 'driver' ? driverNavItems : managementMode === 'customer' ? customerNavItems : websiteNavItems;

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
        className={`w-72 max-w-[85vw] fixed inset-y-0 left-0 bg-white border-r border-slate-200 flex flex-col justify-between p-4 z-50 shadow-xl md:shadow-sm transition-transform duration-300 ${
          isOpenMobile ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-100px)] pr-1">
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

          {/* Mode Switcher Chip with Dropdown */}
          <div className="relative px-1">
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200 transition shadow-2xs group"
            >
              <div className="flex items-center space-x-2 truncate">
                <span className="w-2 h-2 rounded-full bg-[#0043DC] flex-shrink-0" />
                <span className="truncate">
                  {managementMode === 'driver' ? 'Driver Management' : managementMode === 'customer' ? 'Customer Management' : 'Website Management'}
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 flex-shrink-0 ${
                  isDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div className="absolute left-1 right-1 top-full mt-1.5 z-40 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      setManagementMode('driver');
                      setIsDropdownOpen(false);
                      if (currentTab === 'customers') {
                        onSelectTab('overview');
                      }
                    }}
                    className={`w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-bold text-left transition ${
                      managementMode === 'driver'
                        ? 'bg-blue-50 text-[#0043DC]'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Car className="w-4 h-4 text-[#0043DC] flex-shrink-0" />
                    <div className="flex-1 truncate">
                      <div className="text-xs font-bold">Driver Management</div>
                      <div className="text-[10px] text-slate-400 font-normal">Drivers, Trips & Fleet</div>
                    </div>
                    {managementMode === 'driver' && (
                      <Check className="w-3.5 h-3.5 text-[#0043DC] flex-shrink-0" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setManagementMode('customer');
                      setIsDropdownOpen(false);
                      onSelectTab('customers');
                    }}
                    className={`w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-bold text-left transition ${
                      managementMode === 'customer'
                        ? 'bg-blue-50 text-[#0043DC]'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Users className="w-4 h-4 text-[#0043DC] flex-shrink-0" />
                    <div className="flex-1 truncate">
                      <div className="text-xs font-bold">Customer Management</div>
                      <div className="text-[10px] text-slate-400 font-normal">Customer List & CRM</div>
                    </div>
                    {managementMode === 'customer' && (
                      <Check className="w-3.5 h-3.5 text-[#0043DC] flex-shrink-0" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setManagementMode('website');
                      setIsDropdownOpen(false);
                      onSelectTab('website-bookings');
                    }}
                    className={`w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-bold text-left transition ${
                      managementMode === 'website'
                        ? 'bg-blue-50 text-[#0043DC]'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Globe className="w-4 h-4 text-[#0043DC] flex-shrink-0" />
                    <div className="flex-1 truncate">
                      <div className="text-xs font-bold">Website Management</div>
                      <div className="text-[10px] text-slate-400 font-normal">Bookings, Users & Inquiries</div>
                    </div>
                    {managementMode === 'website' && (
                      <Check className="w-3.5 h-3.5 text-[#0043DC] flex-shrink-0" />
                    )}
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-3">
            {managementMode === 'driver' ? 'Driver Navigation' : managementMode === 'customer' ? 'Customer Navigation' : 'Website Navigation'}
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                currentTab === item.id ||
                (item.id === "drivers" && currentTab === "driver-details");

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? "bg-[#0043DC] text-white shadow-md shadow-[#0043DC]/20 font-extrabold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? "text-white" : "text-slate-500"
                      }`}
                    />
                    <span>{item.label}</span>
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
