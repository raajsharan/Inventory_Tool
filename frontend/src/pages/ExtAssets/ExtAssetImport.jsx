import AssetImport from '../Assets/AssetImport.jsx';

export default function ExtAssetImport() {
  return (
    <AssetImport
      apiPrefix="/ext-assets"
      title="Import Ext. Assets from Excel"
      templateFilename="ext-assets-template.xlsx"
    />
  );
}
