"use client";

import { useState, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import Image from "next/image";
import { toast } from "sonner";
import {
  Upload, X, Plus, ArrowLeft, ArrowRight, GripVertical, Check,
  Camera, Tag, Layers, SlidersHorizontal, Package, Sparkles,
  Eye, Warehouse, MessageSquarePlus,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ProductSchema, type ProductInput } from "@/lib/validations/product";
import { createProduct, updateProduct } from "@/services/product.service";
import { uploadProductImage } from "@/services/storage.service";
import { useAuth } from "@/hooks/useAuth";
import { currencyForCountry } from "@/lib/countries";
import { currencySymbol } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import type { Product, ProductOption, ProductVariant } from "@/types";

// ─── Types ────────────────────────────────────────────────────────
interface ImageItem {
  id: string;
  src: string;
  file?: File;
}

interface ProductFormProps {
  product?: Product;
  creatorId: string;
  onSuccess?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────
function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function generateVariants(
  options: ProductOption[],
  existingVariants: ProductVariant[]
): ProductVariant[] {
  if (options.length === 0 || options.some((o) => o.values.length === 0)) return [];
  const combos: Record<string, string>[] = options.reduce<Record<string, string>[]>(
    (acc, option) => {
      if (acc.length === 0) return option.values.map((v) => ({ [option.name]: v }));
      return acc.flatMap((combo) =>
        option.values.map((v) => ({ ...combo, [option.name]: v }))
      );
    },
    []
  );
  return combos.map((opts) => {
    const id = Object.values(opts).map(slugify).join("-");
    const existing = existingVariants.find((v) => v.id === id);
    return existing ?? { id, options: opts, stock: null, enabled: true };
  });
}

// ─── Step config ──────────────────────────────────────────────────
const STEPS = [
  { key: "photos",  icon: Camera },
  { key: "product", icon: Tag },
  { key: "options", icon: Layers },
  { key: "details", icon: SlidersHorizontal },
] as const;

// ─── Progress bar ─────────────────────────────────────────────────
function StepBar({ current }: { current: number }) {
  const t = useTranslations("productForm.steps");
  return (
    <div className="flex items-center mb-8">
      {STEPS.map(({ key, icon: Icon }, i) => {
        const label = t(key);
        const done = i < current;
        const active = i === current;
        return (
          <div key={key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                  done
                    ? "bg-primary text-white"
                    : active
                    ? "bg-primary text-white ring-4 ring-primary/20"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span className={`text-[10px] font-semibold whitespace-nowrap ${active ? "text-primary" : "text-muted-foreground"}`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1.5 mb-5 rounded-full transition-colors ${done ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Sortable image ───────────────────────────────────────────────
function SortableImage({ item, index, onRemove }: { item: ImageItem; index: number; onRemove: (id: string) => void }) {
  const t = useTranslations("productForm.photos");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : undefined, opacity: isDragging ? 0.75 : 1 }}
      className="relative aspect-square group"
    >
      <div className={`relative w-full h-full rounded-xl overflow-hidden bg-muted ${isDragging ? "ring-2 ring-primary shadow-xl" : "ring-1 ring-border"}`}>
        <Image src={item.src} alt={t("imageAlt", { index: index + 1 })} fill className="object-cover" />
        {index === 0 && (
          <span className="absolute bottom-1.5 left-1.5 text-[10px] font-bold bg-black/60 text-white px-1.5 py-0.5 rounded-md">
            {t("main")}
          </span>
        )}
        <button type="button" {...attributes} {...listeners}
          className="absolute top-1.5 left-1.5 h-6 w-6 rounded-lg bg-white/85 backdrop-blur flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={() => onRemove(item.id)}
          className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-white/90 shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Step 1 — Photos ──────────────────────────────────────────────
function StepPhotos({ imageItems, onAddFiles, onRemove, onReorder, uploadProgress }: {
  imageItems: ImageItem[];
  onAddFiles: (files: FileList) => void;
  onRemove: (id: string) => void;
  onReorder: (items: ImageItem[]) => void;
  uploadProgress: number;
}) {
  const t = useTranslations("productForm.photos");
  const inputRef = useRef<HTMLInputElement>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIdx = imageItems.findIndex((i) => i.id === active.id);
      const newIdx = imageItems.findIndex((i) => i.id === over.id);
      onReorder(arrayMove(imageItems, oldIdx, newIdx));
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Camera className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">{t("title")}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{t("subtitle")}</p>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={imageItems.map((i) => i.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-3 gap-2.5">
            {imageItems.map((item, i) => (
              <SortableImage key={item.id} item={item} index={i} onRemove={onRemove} />
            ))}
            {imageItems.length < 5 && (
              <button type="button" onClick={() => inputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1.5 hover:border-primary hover:bg-primary/5 transition-colors text-muted-foreground"
              >
                <Upload className="h-5 w-5" />
                <span className="text-[11px] font-semibold">{t("add")}</span>
              </button>
            )}
          </div>
        </SortableContext>
      </DndContext>

      {imageItems.length === 0 && (
        <button type="button" onClick={() => inputRef.current?.click()}
          className="w-full h-44 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-3 hover:border-primary hover:bg-primary/5 transition-colors text-muted-foreground"
        >
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
            <Camera className="h-7 w-7" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-sm text-foreground">{t("addPhotos")}</p>
            <p className="text-xs mt-0.5">{t("formats")}</p>
          </div>
        </button>
      )}

      {uploadProgress > 0 && uploadProgress < 100 && (
        <div className="h-1.5 bg-border rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all rounded-full" style={{ width: `${uploadProgress}%` }} />
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => e.target.files && onAddFiles(e.target.files)}
      />

      {imageItems.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {t("counter", { count: imageItems.length })}
        </p>
      )}
    </div>
  );
}

// ─── Step 2 — Produit ─────────────────────────────────────────────
function StepProduit({ register, errors, symbol }: {
  register: ReturnType<typeof useForm<ProductInput>>["register"];
  errors: ReturnType<typeof useForm<ProductInput>>["formState"]["errors"];
  symbol: string;
}) {
  const t = useTranslations("productForm.product");
  const tv = useTranslations("validation");
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
          <Package className="h-5 w-5 text-blue-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">{t("title")}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{t("subtitle")}</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="name" className="flex items-center gap-1.5">
          <Tag className="h-3.5 w-3.5 text-muted-foreground" />
          {t("nameLabel")}
        </Label>
        <Input
          id="name"
          placeholder={t("namePlaceholder")}
          className="h-12 text-base"
          {...register("name")}
          aria-invalid={!!errors.name}
          autoFocus
        />
        {errors.name && <p className="text-xs text-destructive">{tv(errors.name.message!)}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description" className="flex items-center gap-1.5">
          <MessageSquarePlus className="h-3.5 w-3.5 text-muted-foreground" />
          {t("descriptionLabel")}
        </Label>
        <Textarea
          id="description"
          placeholder={t("descriptionPlaceholder")}
          className="min-h-28 resize-none"
          {...register("description")}
          aria-invalid={!!errors.description}
        />
        {errors.description && <p className="text-xs text-destructive">{tv(errors.description.message!)}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="price" className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
          {t("priceLabel", { symbol })}
        </Label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-lg">{symbol}</span>
          <Input
            id="price"
            type="number"
            step="0.01"
            min="0"
            placeholder="12.50"
            className="h-12 pl-9 text-lg font-bold"
            {...register("price", { valueAsNumber: true })}
            aria-invalid={!!errors.price}
          />
        </div>
        {errors.price && <p className="text-xs text-destructive">{tv(errors.price.message!)}</p>}
      </div>
    </div>
  );
}

// ─── Step 3 — Options ─────────────────────────────────────────────
function StepOptions({ options, variants, onOptionsChange, onVariantsChange, symbol }: {
  options: ProductOption[];
  variants: ProductVariant[];
  onOptionsChange: (o: ProductOption[]) => void;
  onVariantsChange: (v: ProductVariant[]) => void;
  symbol: string;
}) {
  const t = useTranslations("productForm.options");
  const [newValues, setNewValues] = useState<string[]>(options.map(() => ""));

  function addOption() {
    const updated = [...options, { name: "", values: [], adjustments: {} }];
    onOptionsChange(updated);
    setNewValues((v) => [...v, ""]);
  }

  function removeOption(i: number) {
    onOptionsChange(options.filter((_, idx) => idx !== i));
    setNewValues((v) => v.filter((_, idx) => idx !== i));
  }

  function updateName(i: number, name: string) {
    onOptionsChange(options.map((o, idx) => (idx === i ? { ...o, name } : o)));
  }

  function addValue(i: number) {
    const val = newValues[i]?.trim();
    if (!val || options[i].values.includes(val) || options[i].values.length >= 10) return;
    onOptionsChange(options.map((o, idx) =>
      idx === i
        ? { ...o, values: [...o.values, val], adjustments: { ...(o.adjustments ?? {}), [val]: 0 } }
        : o
    ));
    setNewValues((v) => v.map((s, idx) => (idx === i ? "" : s)));
  }

  function removeValue(oi: number, val: string) {
    onOptionsChange(options.map((o, idx) => {
      if (idx !== oi) return o;
      const adjustments = { ...(o.adjustments ?? {}) };
      delete adjustments[val];
      return { ...o, values: o.values.filter((v) => v !== val), adjustments };
    }));
  }

  function updateAdjustment(optIdx: number, val: string, adj: number) {
    onOptionsChange(options.map((o, idx) =>
      idx === optIdx
        ? { ...o, adjustments: { ...(o.adjustments ?? {}), [val]: adj } }
        : o
    ));
  }

  function updateVariant(id: string, patch: Partial<ProductVariant>) {
    onVariantsChange(variants.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
          <Layers className="h-5 w-5 text-purple-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">{t("title")}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{t("subtitle")}</p>
        </div>
      </div>

      {options.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-border p-8 text-center space-y-3 bg-muted/20">
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mx-auto">
            <Layers className="h-6 w-6 text-purple-400" />
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">{t("noOption")}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("noOptionExample")}
            </p>
          </div>
          <button type="button" onClick={addOption}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:text-primary/80 transition-colors bg-primary/10 px-4 py-2 rounded-xl"
          >
            <Plus className="h-4 w-4" />
            {t("addOption")}
          </button>
        </div>
      )}

      {options.map((opt, i) => (
        <div key={i} className="rounded-xl border border-border p-4 space-y-3 bg-white">
          {/* Option name */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-purple-600">{i + 1}</span>
            </div>
            <Input
              placeholder={t("optionNamePlaceholder")}
              value={opt.name}
              onChange={(e) => updateName(i, e.target.value)}
              className="h-10 flex-1 font-semibold"
            />
            <button type="button" onClick={() => removeOption(i)}
              className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-red-50 hover:text-red-500 transition-colors text-muted-foreground shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Values + adjustments */}
          <div className="flex flex-wrap gap-2">
            {opt.values.map((val) => {
              const adj = opt.adjustments?.[val] ?? 0;
              return (
                <div key={val} className="flex flex-col items-center gap-1 rounded-xl border border-border bg-muted/20 px-3 py-2 min-w-[80px]">
                  <div className="flex items-center gap-1 w-full justify-between">
                    <span className="text-xs font-semibold text-foreground truncate">{val}</span>
                    <button type="button" onClick={() => removeValue(i, val)} className="text-muted-foreground hover:text-red-500 transition-colors shrink-0">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1 w-full">
                    <span className="text-[10px] text-muted-foreground font-medium">+</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={adj === 0 ? "" : adj}
                      placeholder="0"
                      onChange={(e) => updateAdjustment(i, val, parseFloat(e.target.value) || 0)}
                      className="h-6 text-[10px] px-1.5 w-full font-semibold text-primary"
                    />
                    <span className="text-[10px] text-muted-foreground">{symbol}</span>
                  </div>
                </div>
              );
            })}
            {opt.values.length < 10 && (
              <div className="flex items-center gap-1 self-center">
                <Input
                  value={newValues[i] ?? ""}
                  onChange={(e) => setNewValues((v) => v.map((s, idx) => (idx === i ? e.target.value : s)))}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addValue(i))}
                  placeholder={t("addValue")}
                  className="h-8 w-24 text-xs"
                />
                <button type="button" onClick={() => addValue(i)}
                  className="h-8 px-2.5 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors text-xs font-bold"
                >
                  ↵
                </button>
              </div>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">{t("valuesHint", { count: opt.values.length, symbol })}</p>
        </div>
      ))}

      {options.length > 0 && options.length < 3 && (
        <button type="button" onClick={addOption}
          className="flex items-center gap-1.5 text-sm text-primary font-semibold hover:text-primary/80 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t("addAnotherOption")}
        </button>
      )}

      {/* Variants table — stock only, no price column */}
      {variants.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-foreground">
              {t("combinationCount", { count: variants.length })}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Warehouse className="h-3.5 w-3.5" />
              {t("emptyUnlimited")}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">{t("variant")}</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">{t("stock")}</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground">{t("active")}</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v) => (
                  <tr key={v.id} className={`border-b border-border last:border-0 ${!v.enabled ? "opacity-40" : ""}`}>
                    <td className="px-3 py-2.5 font-semibold text-foreground text-xs">
                      {Object.values(v.options).join(" — ")}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number" min="0" placeholder="∞"
                          value={v.stock ?? ""}
                          onChange={(e) =>
                            updateVariant(v.id, { stock: e.target.value === "" ? null : parseInt(e.target.value) || 0 })
                          }
                          className="h-8 w-20 text-xs"
                        />
                        {v.stock !== null && (
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            v.stock === 0 ? "bg-red-500" : v.stock <= 5 ? "bg-orange-400" : "bg-green-500"
                          }`} />
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <Switch checked={v.enabled} onCheckedChange={(val) => updateVariant(v.id, { enabled: val })} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 4 — Détails ─────────────────────────────────────────────
function StepDetails({ active, onActiveChange, trackStock, onTrackStockChange, simpleStock, onSimpleStockChange, hasVariants, hasCustomField, onHasCustomFieldChange, customLabel, onCustomLabelChange, customRequired, onCustomRequiredChange }: {
  active: boolean;
  onActiveChange: (v: boolean) => void;
  trackStock: boolean;
  onTrackStockChange: (v: boolean) => void;
  simpleStock: number | null;
  onSimpleStockChange: (v: number | null) => void;
  hasVariants: boolean;
  hasCustomField: boolean;
  onHasCustomFieldChange: (v: boolean) => void;
  customLabel: string;
  onCustomLabelChange: (v: string) => void;
  customRequired: boolean;
  onCustomRequiredChange: (v: boolean) => void;
}) {
  const t = useTranslations("productForm.details");
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
          <SlidersHorizontal className="h-5 w-5 text-orange-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">{t("title")}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{t("subtitle")}</p>
        </div>
      </div>

      {/* Active */}
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-white px-5 py-4">
        <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
          <Eye className="h-4 w-4 text-green-500" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-foreground text-sm">{t("availableTitle")}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t("availableSub")}</p>
        </div>
        <Switch checked={active} onCheckedChange={onActiveChange} />
      </div>

      {/* Stock — simple products only */}
      {!hasVariants && (
        <div className={`rounded-2xl border bg-white overflow-hidden ${trackStock ? "border-blue-200" : "border-border"}`}>
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <Warehouse className="h-4 w-4 text-blue-500" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground text-sm">{t("trackStockTitle")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t("trackStockSub")}</p>
            </div>
            <Switch checked={trackStock} onCheckedChange={onTrackStockChange} />
          </div>

          {trackStock && (
            <div className="px-5 pb-5 border-t border-blue-100 pt-4 space-y-2">
              <Label className="flex items-center gap-1.5 text-sm font-semibold">
                <Warehouse className="h-3.5 w-3.5 text-blue-400" />
                {t("quantityLabel")}
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min="0"
                  placeholder={t("quantityPlaceholder")}
                  value={simpleStock ?? ""}
                  onChange={(e) =>
                    onSimpleStockChange(e.target.value === "" ? null : parseInt(e.target.value) || 0)
                  }
                  className="h-11 w-32 text-base font-semibold"
                />
                <span className="text-sm text-muted-foreground">{t("unitsInStock")}</span>
                {simpleStock !== null && (
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                    simpleStock === 0
                      ? "bg-red-50 text-red-600"
                      : simpleStock <= 5
                      ? "bg-orange-50 text-orange-600"
                      : "bg-green-50 text-green-600"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      simpleStock === 0 ? "bg-red-500" : simpleStock <= 5 ? "bg-orange-400" : "bg-green-500"
                    }`} />
                    {simpleStock === 0 ? t("ruptureBadge") : simpleStock <= 5 ? t("lowBadge", { count: simpleStock }) : t("inStockBadge", { count: simpleStock })}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {hasVariants && (
        <div className="rounded-2xl border border-border bg-muted/20 px-5 py-4 flex items-center gap-3">
          <Warehouse className="h-4 w-4 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            {t("variantStockNote")}
          </p>
        </div>
      )}

      {/* Custom field */}
      <div className="rounded-2xl border border-border bg-white overflow-hidden">
        <div className="flex items-center gap-4 px-5 py-4">
          <div className="w-9 h-9 rounded-xl bg-pink-50 flex items-center justify-center shrink-0">
            <MessageSquarePlus className="h-4 w-4 text-pink-500" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground text-sm">{t("customFieldTitle")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t("customFieldSub")}</p>
          </div>
          <Switch checked={hasCustomField} onCheckedChange={onHasCustomFieldChange} />
        </div>
        {hasCustomField && (
          <div className="px-5 pb-5 space-y-3 border-t border-border pt-4">
            <div className="space-y-1.5">
              <Label>{t("customLabelLabel")}</Label>
              <Input
                placeholder={t("customLabelPlaceholder")}
                value={customLabel}
                onChange={(e) => onCustomLabelChange(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-foreground font-medium">{t("customRequired")}</p>
              <Switch checked={customRequired} onCheckedChange={onCustomRequiredChange} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Form ────────────────────────────────────────────────────
export function ProductForm({ product, creatorId, onSuccess }: ProductFormProps) {
  const router = useRouter();
  const { store } = useAuth();
  const symbol = currencySymbol(currencyForCountry(store?.country));
  const t = useTranslations("productForm");
  const tc = useTranslations("common");
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [imageItems, setImageItems] = useState<ImageItem[]>(() => {
    const srcs = product?.images?.length ? product.images
      : product?.imageUrl ? [product.imageUrl] : [];
    return srcs.map((src, i) => ({ id: `existing-${i}-${src.slice(-8)}`, src }));
  });

  const [options, setOptions] = useState<ProductOption[]>(
    (product?.options ?? []).map((o) => ({ ...o, adjustments: o.adjustments ?? {} }))
  );
  const [variants, setVariants] = useState<ProductVariant[]>(
    (product?.variants ?? []).map((v) => ({ id: v.id, options: v.options, stock: v.stock ?? null, enabled: v.enabled ?? true }))
  );
  const [trackStock, setTrackStock] = useState(product?.trackStock ?? false);
  const [simpleStock, setSimpleStock] = useState<number | null>(product?.stock ?? null);
  const [hasCustomField, setHasCustomField] = useState(!!product?.customField);
  const [customLabel, setCustomLabel] = useState(product?.customField?.label ?? "");
  const [customRequired, setCustomRequired] = useState(product?.customField?.required ?? false);

  const {
    register,
    getValues,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm<ProductInput>({
    resolver: zodResolver(ProductSchema),
    defaultValues: {
      name: product?.name ?? "",
      description: product?.description ?? "",
      price: product?.price ?? 0,
      active: product?.active ?? true,
      images: product?.images ?? [],
      options: (product?.options ?? []).map((o) => ({ ...o, adjustments: o.adjustments ?? {} })),
      variants: (product?.variants ?? []).map((v) => ({ id: v.id, options: v.options, stock: v.stock ?? null, enabled: v.enabled ?? true })),
      stock: product?.stock ?? null,
      trackStock: product?.trackStock ?? false,
      customField: product?.customField ?? undefined,
    },
  });

  const active = watch("active");

  function handleAddFiles(files: FileList) {
    const arr = Array.from(files).slice(0, 5 - imageItems.length);
    const newItems: ImageItem[] = arr.map((file, i) => ({
      id: `new-${Date.now()}-${i}`,
      src: URL.createObjectURL(file),
      file,
    }));
    setImageItems((prev) => [...prev, ...newItems]);
  }

  function handleRemoveImage(id: string) {
    setImageItems((prev) => prev.filter((item) => item.id !== id));
  }

  const handleOptionsChange = useCallback(
    (newOptions: ProductOption[]) => {
      setOptions(newOptions);
      setValue("options", newOptions);
      const newVariants = generateVariants(newOptions, variants);
      setVariants(newVariants);
      setValue("variants", newVariants);
    },
    [variants, setValue]
  );

  const handleVariantsChange = (v: ProductVariant[]) => {
    setVariants(v);
    setValue("variants", v);
  };

  async function goNext() {
    if (step === 1) {
      const ok = await trigger(["name", "description", "price"]);
      if (!ok) return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function doSubmit() {
    // Validate only the critical user-facing fields (step 2)
    const valid = await trigger(["name", "description", "price"]);
    if (!valid) {
      setStep(1); // go back to step with errors
      toast.error(t("validationError"));
      return;
    }

    setLoading(true);
    try {
      const data = getValues();

      const resolvedImages: string[] = [];
      let uploadCount = 0;
      const totalUploads = imageItems.filter((i) => i.file).length;

      for (const item of imageItems) {
        if (item.file) {
          const url = await uploadProductImage(creatorId, item.file, (p) => {
            const overall = ((uploadCount + p / 100) / Math.max(totalUploads, 1)) * 100;
            setUploadProgress(Math.round(overall));
          });
          resolvedImages.push(url);
          uploadCount++;
        } else {
          resolvedImages.push(item.src);
        }
      }

      const imageUrl = resolvedImages[0] ?? product?.imageUrl ?? "";
      const customField =
        hasCustomField && customLabel.trim()
          ? { label: customLabel.trim(), required: customRequired }
          : undefined;

      // Options sans nom (bloc ajouté puis laissé vide) → clé de map vide dans les
      // variantes → Firestore rejette ("fields must not be empty"). On nettoie :
      // on ne garde que les options nommées avec au moins une valeur, et on écarte
      // les variantes qui référencent une option supprimée/vide.
      const cleanOptions = (options ?? [])
        .map((o) => ({ name: o.name.trim(), values: o.values, adjustments: o.adjustments ?? {} }))
        .filter((o) => o.name !== "" && o.values.length > 0);
      const validNames = new Set(cleanOptions.map((o) => o.name));
      const cleanVariants = (variants ?? [])
        .filter((v) =>
          Object.keys(v.options).every((k) => k.trim() !== "" && validNames.has(k.trim()))
        )
        .map((v) => ({ id: v.id, options: v.options, stock: v.stock ?? null, enabled: v.enabled }));

      const payload = {
        name: data.name,
        description: data.description,
        price: data.price,
        active: data.active ?? true,
        imageUrl,
        images: resolvedImages,
        options: cleanOptions,
        variants: cleanVariants,
        stock: variants.length === 0 ? (simpleStock ?? null) : null,
        trackStock: trackStock ?? false,
        customField: customField ?? null,  // undefined → null (Firestore rejects undefined)
      };

      if (product) {
        await updateProduct(product.id, payload as Record<string, unknown>);
        toast.success(t("updated"));
      } else {
        await createProduct(creatorId, payload as Record<string, unknown>);
        toast.success(t("created"));
      }

      onSuccess?.();
      router.push("/dashboard/products");
    } catch (err) {
      console.error("Save error:", err);
      toast.error(t("saveError"));
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  }

  return (
    // onSubmit preventDefault prevents accidental form submission (Enter key, focus events)
    <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
      <StepBar current={step} />

      <div className="min-h-[320px]">
        {step === 0 && (
          <StepPhotos
            imageItems={imageItems}
            onAddFiles={handleAddFiles}
            onRemove={handleRemoveImage}
            onReorder={setImageItems}
            uploadProgress={uploadProgress}
          />
        )}
        {step === 1 && (
          <StepProduit register={register} errors={errors} symbol={symbol} />
        )}
        {step === 2 && (
          <StepOptions
            options={options}
            variants={variants}
            onOptionsChange={handleOptionsChange}
            onVariantsChange={handleVariantsChange}
            symbol={symbol}
          />
        )}
        {step === 3 && (
          <StepDetails
            active={active}
            onActiveChange={(v) => setValue("active", v)}
            trackStock={trackStock}
            onTrackStockChange={(v) => { setTrackStock(v); setValue("trackStock", v); }}
            simpleStock={simpleStock}
            onSimpleStockChange={setSimpleStock}
            hasVariants={variants.length > 0}
            hasCustomField={hasCustomField}
            onHasCustomFieldChange={setHasCustomField}
            customLabel={customLabel}
            onCustomLabelChange={setCustomLabel}
            customRequired={customRequired}
            onCustomRequiredChange={setCustomRequired}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        {step === 0 ? (
          <Button type="button" variant="outline" className="flex-1 h-12 rounded-xl"
            onClick={() => router.push("/dashboard/products")}
          >
            {tc("cancel")}
          </Button>
        ) : (
          <Button type="button" variant="outline" className="flex-1 h-12 rounded-xl gap-2" onClick={goBack}>
            <ArrowLeft className="h-4 w-4" />
            {tc("back")}
          </Button>
        )}

        {step < STEPS.length - 1 ? (
          <Button type="button" className="flex-1 h-12 rounded-xl font-semibold gap-2" onClick={goNext}>
            {step === 2 ? t("finalize") : t("next")}
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            className="flex-1 h-12 rounded-xl font-semibold"
            disabled={loading}
            onClick={doSubmit}
          >
            {loading
              ? uploadProgress > 0 ? t("uploading", { progress: uploadProgress }) : t("saving")
              : product ? t("update") : t("create")}
          </Button>
        )}
      </div>

      {step === 2 && (
        <button type="button" onClick={() => setStep(3)}
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
        >
          {t("skipStep")}
        </button>
      )}
    </form>
  );
}
