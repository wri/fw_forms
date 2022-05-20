environment               = "dev"
logger_level              = "debug"
desired_count             = 1
auto_scaling_min_capacity = 1
auto_scaling_max_capacity = 5
target_sheet_id = "1JsXX7aE_XlJm-WWhs6wM5IW0UfLi-K9OmOx0mkIb0uA"
legacy_template_id = "597b0f55856351000b087c9c"
default_template_id = "59b6a26b138f260012e9fdeb"
wri_mail_recipients = "sam@3sidedcube.com,tom.yeadon@3sidedcube.com,ben.sherred@3sidedcube.com,javier@3sidedcube.com"

node_env = "dev"
ct_url = "https://staging-api.resourcewatch.org"
areas_api_url = "https://staging-api.resourcewatch.org/v1"
s3_access_key_id = "overridden_in_github_secrets"
s3_secret_access_key = "overridden_in_github_secrets"
s3_bucket = "forest-watcher-files"

healthcheck_path = "/v1/fw_forms/healthcheck"
healthcheck_sns_emails = ["server@3sidedcube.com"]