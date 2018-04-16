package pages.app

import pages.app.base.BaseAppPage

class SMErrPage extends BaseAppPage{
  static at = { $('#authentication_error_header').text().equals('Authentication Error') }

  static url = "/smerr"

  static content = {
    Bceid_business_authentication_failure_message { $('#bceid_business_authentication_failure_message') }
    Bceid_user_authentication_failure_message { $('#bceid_user_authentication_failure_message') }
    Bceid_individual_authentication_failure_message { $('#bceid_individual_authentication_failure_message') }
    Idir_user_authentication_failure_message { $('#idir_user_authentication_failure_message') }
    Unknown_user_type_authentication_failure_message { $('#unknown_user_type_authentication_failure_message') }
  }
}
