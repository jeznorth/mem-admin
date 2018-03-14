package specs.app

import pages.app.LoginPage
import pages.app.HomePage
import modules.FooterModule

abstract class LoggedInSpec extends FixtureSpec {

  def loadFixtures() {
    FixtureSpec.fixture_files =['admin_user_fixture']
    setupFixtures()
  }

  def setupSpec() {
    logout();
    loadFixtures();
    login();
  }

  def login() {
    to LoginPage

    def _username = "user-name"
    def _password = "password"

    login(_username, _password)
    at HomePage
  }

  def logout() {
    clearCookies()
    module(FooterModule).logout()
  }
}
