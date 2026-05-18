import AssetForm from '../Assets/AssetForm.jsx';

export default function PhysicalEsxiForm({ mode }) {
  return (
    <AssetForm
      mode={mode}
      apiPrefix="/physical-esxi"
      listPath="/physical-esxi"
      entityLabel="Server"
      pageKey="physical_esxi_servers"
    />
  );
}
