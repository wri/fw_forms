environment               = "dev"
log_level                 = "debug"
desired_count             = 1
auto_scaling_min_capacity = 1
auto_scaling_max_capacity = 5
target_sheet_id = "1JsXX7aE_XlJm-WWhs6wM5IW0UfLi-K9OmOx0mkIb0uA"
legacy_template_id = "597b0f55856351000b087c9c"
default_template_id = "59b6a26b138f260012e9fdeb"
wri_mail_recipients = "sam@3sidedcube.com,tom.yeadon@3sidedcube.com,ben.sherred@3sidedcube.com,javier@3sidedcube.com"

node_env = "dev"
areas_api_url = "https://api.resourcewatch.org"
s3_access_key_id = "key"
s3_secret_access_key = "key"
s3_bucket = "key"

healthcheck_path = "/v1/fw_forms/healthcheck"
healthcheck_sns_emails = ["server@3sidedcube.com"]