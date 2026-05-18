import AssetList from '../Assets/AssetList.jsx';

export default function PhysicalEsxiList() {
  return (
    <AssetList
      apiPrefix="/physical-esxi"
      basePath="/physical-esxi"
      title="Physical & ESXi Servers"
      exportFilename="physical-esxi-export.xlsx"
      pageKey="physical_esxi_servers"
    />
  );
}
