import AssetImport from '../Assets/AssetImport.jsx';

export default function PhysicalEsxiImport() {
  return (
    <AssetImport
      apiPrefix="/physical-esxi"
      title="Import Physical & ESXi Servers from Excel"
      templateFilename="physical-esxi-template.xlsx"
    />
  );
}
