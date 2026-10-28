import React, { useState, useEffect } from "react";
import {
  X,
  Target,
  Trophy,
  Award,
  Plus,
  Trash2,
  CheckCircle2,
  Users,
  User,
  Layers,
  Sparkles,
  Calendar,
  DollarSign,
  ChevronRight,
  TrendingUp,
  Zap,
  Info
} from "lucide-react";
import type { Partner, PartnerIncentivePlan, IncentiveStage } from "../types";

interface IncentiveSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  partners: Partner[];
  selectedPartnerIds?: string[];
  initialPartner?: Partner | null;
  onSaveIncentivePlan: (
    partnerIds: string[],
    plan: PartnerIncentivePlan,
    targetTrips: number,
    rewardAmount: number
  ) => Promise<void>;
}

export const IncentiveSetupModal: React.FC<IncentiveSetupModalProps> = ({
  isOpen,
  onClose,
  partners,
  selectedPartnerIds = [],
  initialPartner = null,
  onSaveIncentivePlan,
}) => {
  // Scope: 'common' (all partners), 'selected' (multiple checked), 'single' (specific partner)
  const [scope, setScope] = useState<"common" | "selected" | "single">("common");
  const [targetedPartnerIds, setTargetedPartnerIds] = useState<string[]>([]);
  const [singlePartnerId, setSinglePartnerId] = useState<string>("");
  const [partnerSearchQuery, setPartnerSearchQuery] = useState("");

  // Cycle Details
  const [cycleName, setCycleName] = useState("Weekly Fleet Incentive");
  const [cycleType, setCycleType] = useState<"WEEKLY" | "MONTHLY" | "MILESTONE">("WEEKLY");
  const [notes, setNotes] = useState("");

  // Multi-Stage Ladder (Stage 1, Stage 2, etc.)
  const [stages, setStages] = useState<IncentiveStage[]>([
    { stage: 1, title: "Stage 1 (Bronze)", target_trips: 10, reward_amount: 1500 },
    { stage: 2, title: "Stage 2 (Silver)", target_trips: 25, reward_amount: 4000 },
    { stage: 3, title: "Stage 3 (Gold)", target_trips: 50, reward_amount: 10000 },
  ]);

  const [isSaving, setIsSaving] = useState(false);

  // Initialize scope based on props when modal opens
  useEffect(() => {
    if (initialPartner) {
      setScope("single");
      setSinglePartnerId(initialPartner.id);
      if (initialPartner.incentive_plan && initialPartner.incentive_plan.stages?.length > 0) {
        setStages(initialPartner.incentive_plan.stages);
        setCycleName(initialPartner.incentive_plan.cycle_name || "Weekly Fleet Incentive");
        setCycleType(initialPartner.incentive_plan.cycle_type || "WEEKLY");
        setNotes(initialPartner.incentive_plan.notes || "");
      } else if (initialPartner.incentive_target_trips) {
        setStages([
          {
            stage: 1,
            title: "Stage 1 Target",
            target_trips: initialPartner.incentive_target_trips,
            reward_amount: initialPartner.incentive_reward_amount || 1000,
          },
        ]);
      }
    } else if (selectedPartnerIds.length > 0) {
      setScope("selected");
      setTargetedPartnerIds([...selectedPartnerIds]);
    } else {
      setScope("common");
      setTargetedPartnerIds(partners.map((p) => p.id));
      if (partners[0]) setSinglePartnerId(partners[0].id);
    }
  }, [isOpen, initialPartner, selectedPartnerIds, partners]);

  if (!isOpen) return null;

  // Presets
  const applyPreset = (presetType: "1stage" | "2stage" | "3stage") => {
    if (presetType === "1stage") {
      setStages([{ stage: 1, title: "Stage 1 Target", target_trips: 10, reward_amount: 1000 }]);
    } else if (presetType === "2stage") {
      setStages([
        { stage: 1, title: "Stage 1 Starter", target_trips: 15, reward_amount: 2000 },
        { stage: 2, title: "Stage 2 Pro Booster", target_trips: 30, reward_amount: 5000 },
      ]);
    } else if (presetType === "3stage") {
      setStages([
        { stage: 1, title: "Stage 1 (Bronze)", target_trips: 10, reward_amount: 1500 },
        { stage: 2, title: "Stage 2 (Silver)", target_trips: 25, reward_amount: 4000 },
        { stage: 3, title: "Stage 3 (Gold)", target_trips: 50, reward_amount: 10000 },
      ]);
    }
  };

  const handleAddStage = () => {
    const nextStageNum = stages.length + 1;
    const lastStage = stages[stages.length - 1] || { target_trips: 10, reward_amount: 1000 };
    setStages([
      ...stages,
      {
        stage: nextStageNum,
        title: `Stage ${nextStageNum}`,
        target_trips: lastStage.target_trips + 15,
        reward_amount: lastStage.reward_amount + 2500,
      },
    ]);
  };

  const handleRemoveStage = (index: number) => {
    if (stages.length <= 1) return;
    const updated = stages
      .filter((_, i) => i !== index)
      .map((st, i) => ({ ...st, stage: i + 1, title: st.title.startsWith("Stage ") ? `Stage ${i + 1}` : st.title }));
    setStages(updated);
  };

  const handleStageChange = (index: number, field: keyof IncentiveStage, value: any) => {
    const updated = [...stages];
    updated[index] = { ...updated[index], [field]: value };
    setStages(updated);
  };

  const toggleTargetPartner = (pId: string) => {
    setTargetedPartnerIds((prev) =>
      prev.includes(pId) ? prev.filter((id) => id !== pId) : [...prev, pId]
    );
  };

  const toggleSelectAllPartners = () => {
    if (targetedPartnerIds.length === partners.length) {
      setTargetedPartnerIds([]);
    } else {
      setTargetedPartnerIds(partners.map((p) => p.id));
    }
  };

  const filteredPartnersList = partners.filter(
    (p) =>
      p.name.toLowerCase().includes(partnerSearchQuery.toLowerCase()) ||
      p.contact_person.toLowerCase().includes(partnerSearchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(partnerSearchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (stages.length === 0) return;

    let finalPartnerIds: string[] = [];
    if (scope === "common") {
      finalPartnerIds = partners.map((p) => p.id);
    } else if (scope === "selected") {
      finalPartnerIds = targetedPartnerIds.length > 0 ? targetedPartnerIds : partners.map((p) => p.id);
    } else if (scope === "single") {
      finalPartnerIds = singlePartnerId ? [singlePartnerId] : partners[0] ? [partners[0].id] : [];
    }

    if (finalPartnerIds.length === 0) {
      alert("Please select at least one partner to apply the incentive plan to.");
      return;
    }

    setIsSaving(true);
    try {
      const plan: PartnerIncentivePlan = {
        cycle_name: cycleName,
        cycle_type: cycleType,
        stages: stages.map((s, idx) => ({
          stage: idx + 1,
          title: s.title || `Stage ${idx + 1}`,
          target_trips: Number(s.target_trips) || 10,
          reward_amount: Number(s.reward_amount) || 1000,
        })),
        notes: notes,
        updated_at: new Date().toISOString(),
      };

      const primaryTarget = plan.stages[0]?.target_trips || 10;
      const primaryReward = plan.stages[0]?.reward_amount || 1000;

      await onSaveIncentivePlan(finalPartnerIds, plan, primaryTarget, primaryReward);
      onClose();
    } catch (err: any) {
      alert("Failed to save incentive plan: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const targetCountPreview =
    scope === "common"
      ? partners.length
      : scope === "selected"
      ? targetedPartnerIds.length
      : 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/50 via-white to-amber-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#0043DC] text-white flex items-center justify-center shadow-md shadow-[#0043DC]/20">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center space-x-2">
                <span>Incentive Target & Multi-Stage Setup</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-wider">
                  Ladder System
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Setup target trips, bonus payout amounts, and multi-stage ladders (Common, Multi-select, or Partner-wise)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* ======================================================== */}
          {/* 1. APPLICATION SCOPE (COMMON vs MULTI-SELECT vs SINGLE) */}
          {/* ======================================================== */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                <Users className="w-4 h-4 text-[#0043DC]" />
                <span>1. Select Application Scope</span>
              </label>
              <span className="text-[11px] font-bold text-[#0043DC]">
                Will apply to {targetCountPreview} partner{targetCountPreview !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setScope("common")}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  scope === "common"
                    ? "border-[#0043DC] bg-blue-50/60 ring-2 ring-[#0043DC]/20 shadow-xs"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="font-extrabold text-xs text-slate-900 flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#0043DC]" />
                    <span>Common Rule</span>
                  </div>
                  {scope === "common" && <CheckCircle2 className="w-4 h-4 text-[#0043DC]" />}
                </div>
                <div className="text-[11px] text-slate-500">
                  Apply uniformly to <strong>All {partners.length} Partners</strong>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setScope("selected")}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  scope === "selected"
                    ? "border-[#0043DC] bg-blue-50/60 ring-2 ring-[#0043DC]/20 shadow-xs"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="font-extrabold text-xs text-slate-900 flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Multi-Select ({targetedPartnerIds.length})</span>
                  </div>
                  {scope === "selected" && <CheckCircle2 className="w-4 h-4 text-[#0043DC]" />}
                </div>
                <div className="text-[11px] text-slate-500">
                  Select multiple custom partners via checkboxes
                </div>
              </button>

              <button
                type="button"
                onClick={() => setScope("single")}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  scope === "single"
                    ? "border-[#0043DC] bg-blue-50/60 ring-2 ring-[#0043DC]/20 shadow-xs"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="font-extrabold text-xs text-slate-900 flex items-center space-x-1.5">
                    <User className="w-3.5 h-3.5 text-amber-600" />
                    <span>Individual Override</span>
                  </div>
                  {scope === "single" && <CheckCircle2 className="w-4 h-4 text-[#0043DC]" />}
                </div>
                <div className="text-[11px] text-slate-500">
                  Customize specifically for 1 single partner
                </div>
              </button>
            </div>

            {/* Scope = Selected (Partner Checkbox Picker) */}
            {scope === "selected" && (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-700">
                    Choose partners ({targetedPartnerIds.length} of {partners.length} selected):
                  </div>
                  <button
                    type="button"
                    onClick={toggleSelectAllPartners}
                    className="text-[11px] font-extrabold text-[#0043DC] hover:underline"
                  >
                    {targetedPartnerIds.length === partners.length ? "Deselect All" : "Select All"}
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Search partner by name or city..."
                  value={partnerSearchQuery}
                  onChange={(e) => setPartnerSearchQuery(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium"
                />

                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {filteredPartnersList.map((p) => {
                    const isChecked = targetedPartnerIds.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition ${
                          isChecked ? "bg-blue-50 border-blue-300 font-bold" : "bg-white border-slate-200 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleTargetPartner(p.id)}
                            className="rounded text-[#0043DC] focus:ring-[#0043DC]"
                          />
                          <span>{p.name}</span>
                          <span className="text-[10px] text-slate-400 font-normal">({p.city || "Bengaluru"})</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Current: {p.incentive_target_trips || 10} trips
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Scope = Single (Dropdown Picker) */}
            {scope === "single" && (
              <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200 space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Select Partner to Customize:
                </label>
                <select
                  value={singlePartnerId}
                  onChange={(e) => setSinglePartnerId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                >
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.contact_person} ({p.city || "Bengaluru"})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* 2. PLAN DETAILS & CYCLE TYPE                             */}
          {/* ======================================================== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Scheme / Campaign Name
              </label>
              <input
                type="text"
                value={cycleName}
                onChange={(e) => setCycleName(e.target.value)}
                placeholder="e.g. Weekly Target Ladder Bonus"
                className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold text-xs bg-white"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Target Cycle Period
              </label>
              <select
                value={cycleType}
                onChange={(e) => setCycleType(e.target.value as any)}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-bold text-xs bg-white"
              >
                <option value="WEEKLY">Weekly Cycle (Mon - Sun)</option>
                <option value="MONTHLY">Monthly Cycle (Calendar Month)</option>
                <option value="MILESTONE">Milestone Ladder (Cumulative)</option>
              </select>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 3. MULTI-STAGE INCENTIVE SETUP (1-STAGE, 2-STAGE, ETC.) */}
          {/* ======================================================== */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                  <Target className="w-4 h-4 text-emerald-600" />
                  <span>2. Target Trips & Bonus Amount Ladder</span>
                </label>
                <p className="text-[11px] text-slate-500">
                  Setup stages (1-stage, 2-stage, 3-stage) with target trips and payout amounts
                </p>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] font-bold text-slate-400">Presets:</span>
                <button
                  type="button"
                  onClick={() => applyPreset("1stage")}
                  className="px-2 py-1 rounded-md text-[10px] font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                >
                  1-Stage
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("2stage")}
                  className="px-2 py-1 rounded-md text-[10px] font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                >
                  2-Stage
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("3stage")}
                  className="px-2 py-1 rounded-md text-[10px] font-bold border border-blue-200 bg-blue-50 text-[#0043DC]"
                >
                  3-Stage
                </button>
              </div>
            </div>

            {/* Stage Cards */}
            <div className="space-y-2.5">
              {stages.map((stageItem, index) => {
                const perTripBonus =
                  stageItem.target_trips > 0
                    ? Math.round(stageItem.reward_amount / stageItem.target_trips)
                    : 0;

                return (
                  <div
                    key={index}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-300 transition space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="w-6 h-6 rounded-lg bg-[#0043DC] text-white font-black text-xs flex items-center justify-center">
                          {stageItem.stage}
                        </span>
                        <input
                          type="text"
                          value={stageItem.title}
                          onChange={(e) => handleStageChange(index, "title", e.target.value)}
                          placeholder={`Stage ${index + 1} Title`}
                          className="font-bold text-xs text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#0043DC] px-1 py-0.5 outline-none"
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                          ₹{perTripBonus}/trip bonus
                        </span>
                        {stages.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveStage(index)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Remove Stage"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          Target Trips Required
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            value={stageItem.target_trips}
                            onChange={(e) =>
                              handleStageChange(index, "target_trips", parseInt(e.target.value, 10) || 0)
                            }
                            className="w-full p-2 rounded-lg border border-slate-200 font-black text-sm bg-white pr-12 focus:ring-2 focus:ring-[#0043DC] outline-none"
                            required
                          />
                          <span className="absolute right-2.5 top-2 text-xs font-bold text-slate-400">
                            Trips
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          Incentive Bonus Payout (₹)
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-xs font-black text-slate-500">
                            ₹
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="100"
                            value={stageItem.reward_amount}
                            onChange={(e) =>
                              handleStageChange(index, "reward_amount", parseInt(e.target.value, 10) || 0)
                            }
                            className="w-full p-2 pl-6 rounded-lg border border-slate-200 font-black text-sm text-emerald-700 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={handleAddStage}
                className="w-full py-2.5 border-2 border-dashed border-slate-200 hover:border-[#0043DC] rounded-xl text-xs font-bold text-slate-600 hover:text-[#0043DC] transition flex items-center justify-center space-x-1.5 bg-slate-50/50 hover:bg-blue-50/30"
              >
                <Plus className="w-4 h-4" />
                <span>Add Next Stage (Stage {stages.length + 1})</span>
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 4. PLAN SUMMARY PREVIEW BOX                             */}
          {/* ======================================================== */}
          <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200 space-y-2">
            <div className="text-[11px] font-black uppercase tracking-wider text-[#0043DC] flex items-center space-x-1.5">
              <Info className="w-3.5 h-3.5" />
              <span>Incentive Scheme Summary</span>
            </div>
            <div className="text-xs text-slate-700 space-y-1">
              <div>
                Applying <strong>{stages.length}-Stage Ladder</strong> to{" "}
                <span className="font-extrabold text-[#0043DC]">
                  {targetCountPreview} partner{targetCountPreview !== 1 ? "s" : ""}
                </span>:
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {stages.map((st, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-[11px] font-bold text-slate-800 shadow-2xs"
                  >
                    Stage {st.stage}: {st.target_trips} trips → ₹{st.reward_amount.toLocaleString("en-IN")}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-[#0043DC] hover:bg-blue-600 text-white text-xs font-black transition shadow-md shadow-[#0043DC]/20 flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Trophy className="w-4 h-4" />
              <span>{isSaving ? "Saving Scheme..." : `Apply Incentive Scheme (${targetCountPreview})`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
