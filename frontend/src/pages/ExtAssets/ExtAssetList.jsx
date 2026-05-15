import AssetList from '../Assets/AssetList.jsx';

export default function ExtAssetList() {
  return (
    <AssetList
      apiPrefix="/ext-assets"
      basePath="/ext-assets"
      title="Ext. Asset Inventory"
      exportFilename="ext-assets-export.xlsx"
      pageKey="ext_assets"
    />
  );
}
