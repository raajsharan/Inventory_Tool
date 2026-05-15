import AssetForm from '../Assets/AssetForm.jsx';

export default function ExtAssetForm({ mode }) {
  return (
    <AssetForm
      mode={mode}
      apiPrefix="/ext-assets"
      listPath="/ext-assets"
      entityLabel="Ext. Asset"
      pageKey="ext_assets"
    />
  );
}
