environment               = "production"
log_level                 = "info"
desired_count             = 2
auto_scaling_min_capacity = 2
auto_scaling_max_capacity = 15
target_sheet_id           = "1zqiimFua1Lnm9KM4ki_njCaMuRhaPBif30zbvxIZWa4"
legacy_template_id        = "597b0f55856351000b087c9c"
default_template_id       = "59b6a26b138f260012e9fdeb"
wri_mail_recipients       = "mweisse@wri.org"

node_env                  = "production"
ct_url                    = "https://api.resourcewatch.org"
areas_api_url             = "https://gfw-staging.globalforestwatch.org/v1"
s3_access_key_id          = "overridden_in_github_secrets"
s3_secret_access_key      = "overridden_in_github_secrets"
s3_bucket                 = "forest-watcher-files"
healthcheck_path          = "/v1/fw_forms/healthcheck"
healthcheck_sns_emails    = ["server@3sidedcube.com"]