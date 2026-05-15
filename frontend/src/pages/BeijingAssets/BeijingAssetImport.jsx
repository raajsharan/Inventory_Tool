import AssetImport from '../Assets/AssetImport.jsx';

export default function BeijingAssetImport() {
  return (
    <AssetImport
      apiPrefix="/beijing-assets"
      title="Import Beijing Assets from Excel"
      templateFilename="beijing-assets-template.xlsx"
    />
  );
}
