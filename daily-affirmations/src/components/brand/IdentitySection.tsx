'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { AssetDropzone } from '@/components/brand/AssetDropzone';
import { AutosaveInput, AutosaveTextarea } from '@/components/brand/AutosaveField';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { deleteProductIcon, deleteProductLogo, mediaUrl, uploadProductIcon, uploadProductLogo } from '@/lib/api';
import type { ProductProfile } from '@/types/domain';

export function IdentitySection({
  product,
  onPatch,
  onProductChange,
}: {
  product: ProductProfile;
  onPatch: (patch: Partial<ProductProfile>) => void;
  onProductChange: (next: ProductProfile) => void;
}) {
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);

  async function handleLogo(files: File[]) {
    const file = files[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const { product: next } = await uploadProductLogo(product.id, file);
      onProductChange(next);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not upload logo');
    } finally {
      setUploadingLogo(false);
    }
  }

  async function removeLogo() {
    try {
      onProductChange((await deleteProductLogo(product.id)).product);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not remove logo');
    }
  }

  async function handleIcon(files: File[]) {
    const file = files[0];
    if (!file) return;
    setUploadingIcon(true);
    try {
      const { product: next } = await uploadProductIcon(product.id, file);
      onProductChange(next);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not upload icon');
    } finally {
      setUploadingIcon(false);
    }
  }

  async function removeIcon() {
    try {
      onProductChange((await deleteProductIcon(product.id)).product);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not remove icon');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Identity</CardTitle>
        <CardDescription>Name, tagline, description, and brand colors — used throughout every template.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <AutosaveInput label="Name" value={product.name} onSave={(v) => onPatch({ name: v })} />
          <AutosaveInput label="Tagline" value={product.tagline} onSave={(v) => onPatch({ tagline: v })} />
        </div>

        <AutosaveTextarea label="Description" value={product.description} onSave={(v) => onPatch({ description: v })} />

        <div className="grid gap-4 sm:grid-cols-3">
          <AutosaveInput
            label="Primary Color"
            value={product.brandColors.primary}
            onSave={(v) => onPatch({ brandColors: { ...product.brandColors, primary: v } })}
          />
          <AutosaveInput
            label="Secondary Color"
            value={product.brandColors.secondary ?? ''}
            onSave={(v) => onPatch({ brandColors: { ...product.brandColors, secondary: v } })}
          />
          <AutosaveInput
            label="Accent Color"
            value={product.brandColors.accent ?? ''}
            onSave={(v) => onPatch({ brandColors: { ...product.brandColors, accent: v } })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <AssetSlot label="Logo" imagePath={product.logoPath} uploading={uploadingLogo} onFiles={handleLogo} onRemove={removeLogo} />
          <AssetSlot label="App Icon" imagePath={product.appIconPath} uploading={uploadingIcon} onFiles={handleIcon} onRemove={removeIcon} />
        </div>
      </CardContent>
    </Card>
  );
}

function AssetSlot({
  label,
  imagePath,
  uploading,
  onFiles,
  onRemove,
}: {
  label: string;
  imagePath?: string;
  uploading: boolean;
  onFiles: (files: File[]) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {imagePath ? (
        <div className="flex items-center gap-3 rounded-lg border border-border p-3">
          <img src={mediaUrl(imagePath)} alt={label} className="h-12 w-12 rounded object-contain" />
          <Button type="button" size="sm" variant="outline" onClick={onRemove}>
            Remove
          </Button>
        </div>
      ) : (
        <AssetDropzone
          label={uploading ? 'Uploading…' : `Drop ${label.toLowerCase()} here, or click to browse`}
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          disabled={uploading}
          onFiles={onFiles}
        />
      )}
    </div>
  );
}
