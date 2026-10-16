#include "ProcessRunner.hpp"

#include <QProcess>
#include <QString>
#include <QStringList>
#include <utility>

namespace HarmonySync::Core {

namespace {

std::string toStdString(const QByteArray& bytes) {
    return std::string(bytes.constData(), static_cast<std::size_t>(bytes.size()));
}

class QtProcessRunner final : public IProcessRunner {
public:
    void start(const std::string& program, const std::vector<std::string>& arguments,
               ProcessCallbacks callbacks) override {
        auto* process = new QProcess();

        QObject::connect(process, &QProcess::readyReadStandardOutput, process, [process, callbacks]() {
            const std::string chunk = toStdString(process->readAllStandardOutput());
            if (callbacks.onStdout) {
                callbacks.onStdout(chunk);
            }
        });

        QObject::connect(process, &QProcess::finished, process,
                         [process, callbacks](int exitCode, QProcess::ExitStatus exitStatus) {
                             // Output that arrived with the exit may not have raised readyRead yet.
                             const std::string rest = toStdString(process->readAllStandardOutput());
                             if (!rest.empty() && callbacks.onStdout) {
                                 callbacks.onStdout(rest);
                             }
                             if (callbacks.onFinished) {
                                 callbacks.onFinished(exitCode, exitStatus == QProcess::CrashExit,
                                                      toStdString(process->readAllStandardError()));
                             }
                             process->deleteLater();
                         });

        QObject::connect(process, &QProcess::errorOccurred, process,
                         [process, callbacks](QProcess::ProcessError error) {
                             if (error != QProcess::FailedToStart) {
                                 return;
                             }
                             if (callbacks.onStartFailed) {
                                 callbacks.onStartFailed(static_cast<int>(error));
                             }
                             process->deleteLater();
                         });

        QStringList qtArguments;
        for (const std::string& argument : arguments) {
            qtArguments << QString::fromStdString(argument);
        }
        process->start(QString::fromStdString(program), qtArguments);
    }
};

} // namespace

std::unique_ptr<IProcessRunner> createQtProcessRunner() {
    return std::make_unique<QtProcessRunner>();
}

} // namespace HarmonySync::Core
