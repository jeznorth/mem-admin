package specs.app

import pages.app.LoginPage
import pages.app.HomePage
import pages.app.ForgotPasswordPage
import pages.app.SMErrPage

import modules.FooterModule

import spock.lang.Unroll
import spock.lang.Title

@Title("Functional tests for the Login page")
class LoginSpec extends FixtureSpec {
  def _username = "user-name"
  def _password = "password"

  def setup() {
    module(FooterModule).logout()
  }

  @Unroll
  def "Navigate Page from: LoginPage, click Link: #ClickLink, Assert Page: #AssertPage"() {
    given: "I start on the LoginPage"
      to LoginPage
    when: "I click on the #ClickLink"
      page."$ClickLink".click()
    then: "I arrive on the #AssertPage page"
      at AssertPage
    where:
      ClickLink           || AssertPage
      "ForgotPasswordBtn" || ForgotPasswordPage
  }

  def "Navigate Page from: LoginPage, log in as Admin, Assert Page: HomePage"() {

    given: "I start on the LoginPage, am not logged in, and have an account"
      fixture_files =['admin_user_fixture']
      fixture(FixtureSpec.INSERT)
      to LoginPage
    when: "I log in with valid credentials"
      login(_username, _password)
    then: "I am logged in and returned to the HomePage"
      at HomePage
      !footerModule.LogInSiteminderLink
      footerModule.LogOutLink
    cleanup:
      fixture(FixtureSpec.REMOVE)
  }

  def "Navigate Page from: LoginPage, attempt to login using invalid usename and invalid password, Assert Page: SMErrorPage"() {

    given: "I start on the LoginPage, am not logged in"
      fixture_files =['admin_user_fixture']
      fixture(FixtureSpec.INSERT)
      to LoginPage
    when: "and attempt to log in with an invalid username and invalid password"
      login('foo', 'bar')
    then: "I am redirected to the error page, am not logged in, and am provided an unauthorized message"
      at SMErrPage

      !Bceid_business_authentication_failure_message.displayed

      !Bceid_user_authentication_failure_message.displayed

      !Bceid_individual_authentication_failure_message.displayed

      !Idir_user_authentication_failure_message.displayed

      Unknown_user_type_authentication_failure_message.displayed

      !footerModule.LogOutLink
      footerModule.LogInSiteminderLink
    cleanup:
      fixture(FixtureSpec.REMOVE)
  }

  def "Navigate Page from: LoginPage, attempt to login using a valid usename and an invalid password, Assert Page: SMErrorPage"() {

    given: "I start on the LoginPage, am not logged in"
      fixture_files =['admin_user_fixture']
      fixture(FixtureSpec.INSERT)
      to LoginPage
    when: "and attempt to log in with a valid username and an invalid password"
      login(_username, 'foo')
    then: "I am redirected to the error page, am not logged in, and am provided an unauthorized message"
      at SMErrPage

      !Bceid_business_authentication_failure_message.displayed

      !Bceid_user_authentication_failure_message.displayed

      !Bceid_individual_authentication_failure_message.displayed

      !Idir_user_authentication_failure_message.displayed

      Unknown_user_type_authentication_failure_message.displayed

      !footerModule.LogOutLink
      footerModule.LogInSiteminderLink
    cleanup:
      fixture(FixtureSpec.REMOVE)
  }

  def "Navigate Page from: LoginPage, attempt to login using an invalid usename and a valid password, Assert Page: SMErrorPage"() {

    given: "I start on the LoginPage, am not logged in"
      fixture_files =['admin_user_fixture']
      fixture(FixtureSpec.INSERT)
      to LoginPage
    when: "and attempt to log in with an invalid username and a valid password"
      login('foo', _password)
    then: "I am redirected to the error page, am not logged in, and am provided an unauthorized message"
      at SMErrPage

      !Bceid_business_authentication_failure_message.displayed

      !Bceid_user_authentication_failure_message.displayed

      !Bceid_individual_authentication_failure_message.displayed

      !Idir_user_authentication_failure_message.displayed

      Unknown_user_type_authentication_failure_message.displayed

      !footerModule.LogOutLink
      footerModule.LogInSiteminderLink
    cleanup:
      fixture(FixtureSpec.REMOVE)
  }
}
