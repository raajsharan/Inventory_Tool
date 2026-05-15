-- =====================================================================
-- Seed data
-- Users are created via `node backend/scripts/seedUsers.js` so that
-- bcrypt hashes are generated locally and never committed.
-- This file seeds dropdowns + sample assets only.
-- =====================================================================

-- Dropdown master values
INSERT INTO dropdown_master (category, value, parent_value, sort_order) VALUES
  ('os_type','Windows',NULL,1),
  ('os_type','Linux',NULL,2),
  ('os_type','VMware ESXi',NULL,3),
  ('os_type','Solaris',NULL,4),
  ('os_type','Other',NULL,9),

  ('os_version','Windows Server 2019','Windows',1),
  ('os_version','Windows Server 2022','Windows',2),
  ('os_version','Windows 10','Windows',3),
  ('os_version','Windows 11','Windows',4),
  ('os_version','Ubuntu 20.04','Linux',1),
  ('os_version','Ubuntu 22.04','Linux',2),
  ('os_version','RHEL 8','Linux',3),
  ('os_version','RHEL 9','Linux',4),
  ('os_version','CentOS 7','Linux',5),
  ('os_version','ESXi 7.0','VMware ESXi',1),
  ('os_version','ESXi 8.0','VMware ESXi',2),

  ('server_status','Active',NULL,1),
  ('server_status','Inactive',NULL,2),
  ('server_status','Decommissioned',NULL,3),
  ('server_status','Maintenance',NULL,4),

  ('patching_type','Automatic',NULL,1),
  ('patching_type','Manual',NULL,2),
  ('patching_type','Not Applicable',NULL,3),

  ('server_patch_type','Production',NULL,1),
  ('server_patch_type','Pre-Production',NULL,2),
  ('server_patch_type','Test',NULL,3),
  ('server_patch_type','Dev',NULL,4),

  ('patching_schedule','Weekly',NULL,1),
  ('patching_schedule','Bi-Weekly',NULL,2),
  ('patching_schedule','Monthly',NULL,3),
  ('patching_schedule','Quarterly',NULL,4),

  ('location','Data Center 1',NULL,1),
  ('location','Data Center 2',NULL,2),
  ('location','Cloud - AWS',NULL,3),
  ('location','Cloud - Azure',NULL,4),
  ('location','Branch Office',NULL,5),
  ('location','HQ',NULL,6),

  ('eol_status','Supported',NULL,1),
  ('eol_status','Approaching EOL',NULL,2),
  ('eol_status','EOL',NULL,3),
  ('eol_status','Extended Support',NULL,4)
ON CONFLICT DO NOTHING;

-- Sample assets
INSERT INTO assets (
  vm_name, os_hostname, ip_address, asset_type, os_type, os_version,
  assigned_user, department, business_purpose, server_status,
  patching_type, server_patch_type, patching_schedule, location, eol_status,
  serial_number, ome_status, asset_tag, manage_engine_installed, tenable_installed, idrac_enabled
) VALUES
  ('PROD-WEB-01','prod-web-01.corp.local','10.10.1.10','Virtual Server','Linux','Ubuntu 22.04',
   'John Doe','IT Infrastructure','Production web hosting','Active',
   'Automatic','Production','Monthly','Data Center 1','Supported',
   'SN-WEB-001','OK','AT-001',TRUE,TRUE,FALSE),
  ('PROD-DB-01','prod-db-01.corp.local','10.10.1.20','Physical Server','Linux','RHEL 9',
   'Jane Smith','IT Infrastructure','Production database','Active',
   'Manual','Production','Quarterly','Data Center 1','Supported',
   'SN-DB-001','OK','AT-002',TRUE,TRUE,TRUE),
  ('TEST-APP-01','test-app-01.corp.local','10.20.1.10','Virtual Server','Windows','Windows Server 2019',
   'Mike Brown','Engineering','Application test env','Active',
   'Automatic','Test','Weekly','Data Center 2','Approaching EOL',
   'SN-APP-001','OK','AT-003',FALSE,TRUE,FALSE),
  ('LEGACY-FS-01','legacy-fs-01.corp.local','10.30.1.5','Physical Server','Windows','Windows Server 2019',
   'Sara Lee','Finance','Legacy file server','Maintenance',
   'Manual','Production','Monthly','HQ','EOL',
   'SN-FS-001','Warning','AT-004',FALSE,FALSE,TRUE)
ON CONFLICT (vm_name) DO NOTHING;
