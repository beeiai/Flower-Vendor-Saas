import React, { useRef, useState } from "react";
import SearchableSelect from "../shared/SearchableSelect";
import {
  Users,
  Edit2,
  Trash2,
  Database,
} from "lucide-react";

export default function DailyTransactionsView({
  customerInfo = {},
  setCustomerInfo = () => {},
  groups = [],
  customers = [],
  catalog = [],
  vehicles = [],
  onOpenQuickAdd = () => {},
  currentEntry = {},
  setCurrentEntry = () => {},
  items = [],
  onAddItem = () => {},
  onRemoveItem = () => {},
  onEditItem = () => {},
  advanceStore = {},
  commissionPct = 0,
  onSaveRecord = () => {},
}) {
  const [saving, setSaving] = useState(false);

  // refs for keyboard navigation
  const vRef = useRef(null);
  const cRef = useRef(null);
  const nRef = useRef(null);
  const qRef = useRef(null);
  const rRef = useRef(null);
  const lRef = useRef(null);
  const coRef = useRef(null);
  const pRef = useRef(null);
  const remRef = useRef(null);

  // ✅ Safe defaults for arrays
  const safeGroups = groups || [];
  const safeCustomers = customers || [];
  const safeCatalog = catalog || [];
  const safeVehicles = vehicles || [];
  const safeItems = items || [];

  const filteredCustomers = safeCustomers.filter(
    (c) =>
      !customerInfo.groupName ||
      (c.group && c.group === customerInfo.groupName)
  );

  const remAdvance =
    advanceStore?.[customerInfo.customerName]?.balance || 0;

  const handleCustomerSelect = (name) => {
    const c = safeCustomers.find((x) => x.name === name);
    if (!c) return;
    setCustomerInfo({
      customerName: c.name,
      groupName: c.group,
      contactNo: c.contact,
      address: c.address,
      farmerId: c.id,
    });
  };

  const handleAddItem = () => {
    if (!currentEntry.vehicle || !currentEntry.itemName || !currentEntry.qty)
      return alert("Vehicle, Item & Qty required");

    onAddItem();
  };

  const handleSaveToBackend = async () => {
    if (!customerInfo.farmerId)
      return alert("Select farmer first");

    if (safeItems.length === 0)
      return alert("No transactions to save");

    try {
      setSaving(true);
      await onSaveRecord();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-2 h-full p-2 bg-[#f1f3f5] overflow-hidden">
      {/* CUSTOMER SECTION */}
      <section className="bg-white border border-slate-300 p-3 shadow-sm shrink-0">
        <div className="flex items-center gap-2 mb-2 text-rose-600 font-black text-[9px] uppercase border-b pb-1">
          <Users className="w-3 h-3" /> Trading Client Data
        </div>

        <div className="grid grid-cols-5 gap-4">
          <SearchableSelect
            label="Group Category"
            options={safeGroups.map((g) => g.name)}
            value={customerInfo.groupName || ""}
            onChange={(val) =>
              setCustomerInfo({
                ...customerInfo,
                groupName: val,
                customerName: "",
              })
            }
            placeholder="Filter Group"
          />

          <SearchableSelect
            label="Party/Customer"
            options={filteredCustomers.map((c) => c.name)}
            value={customerInfo.customerName || ""}
            onChange={handleCustomerSelect}
            placeholder="Search Party"
          />

          <div>
            <label className="text-[9px] font-bold text-slate-500 uppercase">Address</label>
            <input
              type="text"
              readOnly
              className="w-full bg-slate-50 border p-1 text-[11px] text-slate-600 cursor-not-allowed"
              value={String(customerInfo.address || "--")}
            />
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-500 uppercase">Phone</label>
            <input
              type="text"
              readOnly
              className="w-full bg-slate-50 border p-1 text-[11px] text-slate-600 cursor-not-allowed"
              value={String(customerInfo.contactNo || "--")}
            />
          </div>
          <div>
            <label className="text-[9px] font-bold text-rose-600 uppercase">Rem. Advance</label>
            <input
              type="text"
              readOnly
              className="w-full bg-rose-50 border border-rose-200 text-rose-600 p-1 text-[11px] font-black cursor-not-allowed"
              value={`₹ ${remAdvance.toFixed(2)}`}
            />
          </div>
        </div>
      </section>

      {/* ENTRY ROW */}
      <section className="bg-white border border-slate-400 shadow-sm flex flex-col relative z-30 shrink-0 overflow-visible">
        <div className="bg-slate-100 px-3 py-1 border-b text-slate-700 font-black text-[9px] uppercase flex items-center gap-2">
          <Database className="w-3 h-3" /> Data Entry Row
        </div>

        <div className="p-2 border-b bg-slate-50 overflow-x-auto">
          <div className="flex items-end gap-1 min-w-[850px]">
            <div className="w-[85px]">
              <label className="text-[8px] font-black text-slate-500 uppercase text-center block">Date</label>
              <input
                type="date"
                className="w-full text-[11px] border border-slate-400 px-1 py-0.5 font-bold h-[28px] outline-none"
                value={currentEntry.date || ""}
                onChange={(e) =>
                  setCurrentEntry({
                    ...currentEntry,
                    date: e.target.value,
                  })
                }
              />
            </div>

            <div className="w-[110px]">
              <SearchableSelect
                inputRef={vRef}
                label="Vehicle"
                options={safeVehicles.map((v) => v.name)}
                value={currentEntry.vehicle || ""}
                onChange={(v) =>
                  setCurrentEntry({ ...currentEntry, vehicle: v })
                }
              />
            </div>

            <div className="w-[100px]">
              <SearchableSelect
                inputRef={cRef}
                label="Item Code"
                options={safeCatalog.map((i) => i.itemCode)}
                value={currentEntry.itemCode || ""}
                onChange={(c) => {
                  const item = safeCatalog.find((x) => x.itemCode === c);
                  setCurrentEntry({
                    ...currentEntry,
                    itemCode: c,
                    itemName: item?.itemName || currentEntry.itemName,
                  });
                }}
              />
            </div>

            <div className="w-[120px]">
              <SearchableSelect
                inputRef={nRef}
                label="Product"
                options={safeCatalog.map((i) => i.itemName)}
                value={currentEntry.itemName || ""}
                onChange={(n) => {
                  const item = safeCatalog.find((x) => x.itemName === n);
                  setCurrentEntry({
                    ...currentEntry,
                    itemName: n,
                    itemCode: item?.itemCode || currentEntry.itemCode,
                  });
                }}
              />
            </div>

            <div className="w-[60px]">
              <label className="text-[8px] font-black uppercase text-slate-500 block text-center">Qty</label>
              <input
                ref={qRef}
                type="number"
                className="w-full border px-1.5 h-[28px] text-right text-[11px] outline-none focus:border-rose-600"
                value={currentEntry.qty || ""}
                onChange={(e) =>
                  setCurrentEntry({
                    ...currentEntry,
                    qty: e.target.value,
                  })
                }
              />
            </div>

            <div className="w-[70px]">
              <label className="text-[8px] font-black uppercase text-slate-500 block text-center">Rate</label>
              <input
                ref={rRef}
                type="number"
                className="w-full border px-1.5 h-[28px] text-right text-[11px] outline-none focus:border-rose-600"
                value={currentEntry.rate || ""}
                onChange={(e) =>
                  setCurrentEntry({
                    ...currentEntry,
                    rate: e.target.value,
                  })
                }
              />
            </div>

            <div className="ml-auto">
              <button
                onClick={handleAddItem}
                className="bg-slate-900 text-white px-6 h-[28px] text-[9px] font-black uppercase hover:bg-rose-600 shadow-md transition-all"
              >
                ADD
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* TABLE */}
      <section className="bg-white border flex-1 overflow-auto">
        <table className="w-full text-[11px]">
          <thead className="bg-green-700 text-white sticky top-0">
            <tr>
              <th className="p-2 text-center">Sl.No.</th>
              <th className="p-2">Vehicle</th>
              <th className="p-2">Date</th>
              <th className="p-2">Item Code</th>
              <th className="p-2">Item Name</th>
              <th className="p-2 text-right">Qty</th>
              <th className="p-2 text-right">Rate</th>
              <th className="p-2 text-right">Total</th>
              <th className="p-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {safeItems.length === 0 ? (
              <tr>
                <td colSpan="9" className="p-4 text-center text-slate-300 italic text-[10px]">
                  No items recorded
                </td>
              </tr>
            ) : (
              safeItems.map((i, idx) => {
                const total = (Number(i.qty) || 0) * (Number(i.rate) || 0);
                return (
                  <tr key={i.id} className="border-b hover:bg-slate-50">
                    <td className="p-2 text-center text-slate-400 font-bold">{idx + 1}</td>
                    <td className="p-2 font-bold text-slate-700">{i.vehicle || "--"}</td>
                    <td className="p-2 text-slate-500">{i.date || "--"}</td>
                    <td className="p-2 text-slate-500">{i.itemCode || "--"}</td>
                    <td className="p-2 font-bold text-slate-800">{i.itemName || "--"}</td>
                    <td className="p-2 text-right font-black">{i.qty || "0"}</td>
                    <td className="p-2 text-right font-mono">₹{i.rate || "0"}</td>
                    <td className="p-2 text-right font-black text-rose-600">₹{total.toLocaleString()}</td>
                    <td className="p-2 text-center space-x-1">
                      <button
                        onClick={() => onEditItem(i)}
                        className="p-1 hover:bg-blue-100 rounded"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => onRemoveItem(i.id)}
                        className="p-1 hover:bg-red-100 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      {/* SAVE BUTTON */}
      <button
        disabled={saving}
        onClick={handleSaveToBackend}
        className="bg-rose-600 text-white py-2 font-black uppercase hover:bg-rose-700 disabled:opacity-50 transition-all shrink-0"
      >
        {saving ? "Saving..." : "SAVE MASTER JOURNAL"}
      </button>
    </div>
  );
}
