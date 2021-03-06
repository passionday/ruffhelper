var config = require('../config');
var spawn = require('child_process').spawn;
// var exec = require('child_process').exec;//exec最大数据不能超过200k，rap log会超出，只能使用spawn
import { tr } from './Utils';
import { addLog, COLOR_RED ,COLOR_GREEN} from '../actions/AppActions.jsx';
exports.sendCommands = function (command, parentDir, callBackMessage,callBackEnd, inputObj) {
    console.log('RapCommand.sendCommand:', command)

    //把命令解析成数组 比如['deploy','-s']
    // var execCommand = 'rap'
    var trueCmd = command.split(' ');
    var arrOpts = [];
    for (var i = 1, len = trueCmd.length; i < len; i++) {

        arrOpts.push(trueCmd[i])
        // execCommand += ` ${trueCmd[i]}`
    }

    // console.log('trueCmd:', trueCmd);
    // console.log('arrOpts:', arrOpts);
    // console.log('parentDir:', parentDir);
    // console.log('platform:', config.platform)
    var outputObj = {};
    // console.log('arrOpts:',arrOpts)
    // console.log('parentDir:',parentDir)
    // console.log('execCommand:',execCommand)
    if (config.platform == "Windows") {
        var childProcess = spawn(trueCmd[0], arrOpts, { cwd: parentDir });
    } else {//mac
        // childProcess = exec(trueCmd[0], arrOpts, { cwd: parentDir });
        childProcess = spawn('/usr/local/bin/rap', arrOpts, { cwd: parentDir });
        // childProcess = exec(execCommand, { cwd: parentDir });
    }
    var raplogPid = childProcess.pid;
    // console.log('raplogPid:', raplogPid)
    childProcess.stdout.on('data', function (data) {
        // console.log(111,data.toString('utf8'))
        var result = decodeData(data);
        // console.log('stdout.data12:', `"${result}"`)
        var pureResult = getPureResult(result);
        // console.log('pureResult', pureResult)
        if (!result || pureResult == "") {//console.log('没有返回消息，跳过');
            return;
        }
        // console.log('inputObj:', inputObj)
        var find = false;
        for (var key in inputObj) {
            if (result.indexOf(key) > -1) {
                var inputValue = inputObj[key];
                // console.log('inputValue:',inputValue)
                childProcess.stdin.write(inputValue + '\n');
                if (inputValue) {
                    result = key + ": " + inputValue;
                } else {
                    result = key+":";
                }
                // console.log('-----addLog-----:', result);
                find = true;
                callBackMessage(result);
                delete inputObj[key];
                outputObj[getPureResult(key)] = inputValue;
                if(Object.getOwnPropertyNames(inputObj).length == 0) {
                    inputObj = null;
                    childProcess.stdin.end();//输入结束
                }
                break;
            }
        }
        // console.log('outputObj:', outputObj)
        for (key in outputObj) {//输出的信息里不包含输入的内容
            if (pureResult.indexOf(key) > -1) {
                find = true;
                return;
            }
        }
        if (!find) {
            // console.log('-----addLog2-----:', result);
            callBackMessage(result);
        }
    })
    childProcess.stdout.on('end', function (data) {
        console.log("stdout.end:", data);
    })
    childProcess.stderr.on('data', function (data) {
        console.log("stderr:", data);
    });
    childProcess.on('exit', function (code, signal) {
        console.log('stdout.exit:', code, signal)
        // if(command!='rap log'){
        //     addLog(tr(213),COLOR_GREEN);//命令执行结束
        // }
        if (signal) {
            // console.log('kill')
            childProcess = null;
        }
        if (callBackEnd) callBackEnd();
    })
    childProcess.on('error', function (error) {
        console.log('error:', error)
    })

    // childProcess = spawn('/usr/local/bin/rap',arrOpts, { cwd: parentDir });
}
/**把子进程返回的数据解码 */
function decodeData(data) {
    // var arr = ["[l000D",'[1000D',"[?25h","[33D"];
    var result = data.toString('utf8');
    result = result.replace(/\[[?a-z]*[0-9]{1,4}[a-z,A-Z]*/g, "");
    if (result.indexOf('\n') == 0) {
        // console.log('清除掉开头的换行');
        result = result.replace(/\n/, "");
    }
    result = result.replace(/\r\n|\n|\n\n$/, "");//去掉最后一个\n
    result = result.replace(/\[K/g, "");
    return result;
}
/**清除非法字符的纯净结果*/
function getPureResult(value) {
    return value.replace(/[^\w\?\(\)-]/g, '');
}