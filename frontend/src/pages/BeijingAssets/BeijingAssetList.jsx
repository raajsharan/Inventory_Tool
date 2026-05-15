import AssetList from '../Assets/AssetList.jsx';

export default function BeijingAssetList() {
  return (
    <AssetList
      apiPrefix="/beijing-assets"
      basePath="/beijing-assets"
      title="Beijing Asset Inventory"
      exportFilename="beijing-assets-export.xlsx"
    />
  );
}
