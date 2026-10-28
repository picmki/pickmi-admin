import React, { useState, useEffect } from "react";
import {
  Radio,
  Sliders,
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
  Building2,
  Compass,
  Award,
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
  const [managementMode, setManagementMode] = useState<'driver' | 'customer' | 'website' | 'partner'>(() => {
    if (currentTab === 'partners' || currentTab === 'partner-trips' || currentTab === 'partner-incentives' || (currentTab as any) === 'partner-details') {
      return 'partner';
    }
    if (currentTab === 'website-bookings' || currentTab === 'website-book-cab' || currentTab === 'website-users' || currentTab === 'website-applications' || currentTab === 'website-inquiries' || currentTab === 'website-pricing-rules' || (currentTab as any) === 'customer-details') {
      return 'website';
    }
    return currentTab === 'customers' ? 'customer' : 'driver';
  });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    if (currentTab === 'partners' || currentTab === 'partner-trips' || currentTab === 'partner-incentives' || (currentTab as any) === 'partner-details') {
      setManagementMode('partner');
    } else if (currentTab === 'customers') {
      setManagementMode('customer');
    } else if (currentTab === 'website-bookings' || currentTab === 'website-book-cab' || currentTab === 'website-users' || currentTab === 'website-applications' || currentTab === 'website-inquiries' || currentTab === 'website-pricing-rules' || (currentTab as any) === 'customer-details') {
      setManagementMode('website');
    } else {
      setManagementMode('driver');
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


  // Partner Management Navigation Items
  const partnerNavItems = [
    {
      id: "partners" as NavTab,
      label: "Partner Directory",
      icon: Building2,
    },
    {
      id: "partner-trips" as NavTab,
      label: "Partner Trips & Dispatch",
      icon: Compass,
    },
    {
      id: "partner-incentives" as NavTab,
      label: "Incentives & Payouts",
      icon: Award,
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
      id: "website-pricing-rules" as NavTab,
      label: "Fleet & Pricing Rules",
      icon: Sliders,
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

  const navItems = managementMode === 'driver' ? driverNavItems : managementMode === 'customer' ? customerNavItems : managementMode === 'partner' ? partnerNavItems : websiteNavItems;

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
        className={`w-72 max-w-[85vw] md:w-64 fixed inset-y-0 left-0 bg-white border-r border-slate-200 flex flex-col justify-between p-4 z-50 shadow-xl md:shadow-none transition-transform duration-300 ${
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
                  {managementMode === 'driver' ? 'Driver Management' : managementMode === 'customer' ? 'Customer Management' : managementMode === 'partner' ? 'Partner Management' : 'Website Management'}
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 flex-shrink-0 ${
                  isDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Expandable Mode Selector (In-flow so it never covers navigation links) */}
            {isDropdownOpen && (
              <div className="mt-2 bg-slate-50 border border-slate-200/90 rounded-xl overflow-hidden p-1 space-y-0.5 animate-in fade-in duration-150 shadow-2xs">
                <button
                  type="button"
                  onClick={() => {
                    setManagementMode('driver');
                    setIsDropdownOpen(false);
                    if (currentTab === 'customers') {
                      onSelectTab('overview');
                    }
                  }}
                  className={`w-full flex items-center space-x-2 px-2.5 py-2 rounded-lg text-xs font-bold text-left transition ${
                    managementMode === 'driver'
                      ? 'bg-[#0043DC]/10 text-[#0043DC]'
                      : 'text-slate-600 hover:bg-white hover:text-slate-900'
                  }`}
                >
                  <Car className="w-4 h-4 text-[#0043DC] shrink-0" />
                  <div className="flex-1 truncate">
                    <div className="text-xs font-bold leading-tight">Driver Management</div>
                    <div className="text-[10px] text-slate-400 font-normal">Drivers, Trips & Fleet</div>
                  </div>
                  {managementMode === 'driver' && (
                    <Check className="w-3.5 h-3.5 text-[#0043DC] shrink-0" />
                  )}
                </button>


                <button
                  type="button"
                  onClick={() => {
                    setManagementMode("partner");
                    setIsDropdownOpen(false);
                    onSelectTab("partners");
                  }}
                  className={`w-full flex items-center space-x-2 px-2.5 py-2 rounded-lg text-xs font-bold text-left transition ${
                    managementMode === "partner"
                      ? "bg-[#0043DC]/10 text-[#0043DC]"
                      : "text-slate-600 hover:bg-white hover:text-slate-900"
                  }`}
                >
                  <Building2 className="w-4 h-4 text-[#0043DC] shrink-0" />
                  <div className="flex-1 truncate">
                    <div className="text-xs font-bold leading-tight">Partner Management</div>
                    <div className="text-[10px] text-slate-400 font-normal">Fleet Partners & Trips</div>
                  </div>
                  {managementMode === "partner" && (
                    <Check className="w-3.5 h-3.5 text-[#0043DC] shrink-0" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setManagementMode('customer');
                    setIsDropdownOpen(false);
                    onSelectTab('customers');
                  }}
                  className={`w-full flex items-center space-x-2 px-2.5 py-2 rounded-lg text-xs font-bold text-left transition ${
                    managementMode === 'customer'
                      ? 'bg-[#0043DC]/10 text-[#0043DC]'
                      : 'text-slate-600 hover:bg-white hover:text-slate-900'
                  }`}
                >
                  <Users className="w-4 h-4 text-[#0043DC] shrink-0" />
                  <div className="flex-1 truncate">
                    <div className="text-xs font-bold leading-tight">Customer Management</div>
                    <div className="text-[10px] text-slate-400 font-normal">Customer List & CRM</div>
                  </div>
                  {managementMode === 'customer' && (
                    <Check className="w-3.5 h-3.5 text-[#0043DC] shrink-0" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setManagementMode('website');
                    setIsDropdownOpen(false);
                    onSelectTab('website-bookings');
                  }}
                  className={`w-full flex items-center space-x-2 px-2.5 py-2 rounded-lg text-xs font-bold text-left transition ${
                    managementMode === 'website'
                      ? 'bg-[#0043DC]/10 text-[#0043DC]'
                      : 'text-slate-600 hover:bg-white hover:text-slate-900'
                  }`}
                >
                  <Globe className="w-4 h-4 text-[#0043DC] shrink-0" />
                  <div className="flex-1 truncate">
                    <div className="text-xs font-bold leading-tight">Website Management</div>
                    <div className="text-[10px] text-slate-400 font-normal">Bookings, Users & Inquiries</div>
                  </div>
                  {managementMode === 'website' && (
                    <Check className="w-3.5 h-3.5 text-[#0043DC] shrink-0" />
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-3">
            {managementMode === 'driver' ? 'Driver Navigation' : managementMode === 'customer' ? 'Customer Navigation' : managementMode === 'partner' ? 'Partner Navigation' : 'Website Navigation'}
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                currentTab === item.id ||
                (item.id === "drivers" && currentTab === "driver-details") || (item.id === "partners" && currentTab === "partner-details");

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

        {/* Sidebar Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between px-2 text-[11px] text-slate-400">
          <span className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-medium text-slate-600">PickMi Fleet v2.0</span>
          </span>
          <span className="text-[10px] font-mono font-bold text-slate-400">ONLINE</span>
        </div>
      </aside>
    </>
  );
};
