#include "CommandRunner.hpp"

#include <QProcess>
#include <QString>
#include <QStringList>

namespace HarmonySync::Media {

namespace {

class QtCommandRunner final : public ICommandRunner {
public:
    bool run(const std::string& program, const std::vector<std::string>& arguments) override {
        QStringList qtArguments;
        for (const std::string& argument : arguments) {
            qtArguments << QString::fromStdString(argument);
        }
        QProcess process;
        process.start(QString::fromStdString(program), qtArguments);
        return process.waitForFinished(-1) && process.exitStatus() == QProcess::NormalExit && process.exitCode() == 0;
    }
};

} // namespace

std::unique_ptr<ICommandRunner> createQtCommandRunner() {
    return std::make_unique<QtCommandRunner>();
}

} // namespace HarmonySync::Media
