// MIT License
//
// Copyright 2018 Electric Imp
//
// SPDX-License-Identifier: MIT
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO
// EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES
// OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
// ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
// OTHER DEALINGS IN THE SOFTWARE.

'use strict';

const ImpCentralApi = require('imp-central-api');
const DeviceGroups = ImpCentralApi.DeviceGroups;
const Prompt = require('prompt-sync')();
const Util = require('util');
const CliSpinner = require('cli-spinner').Spinner;
const Colors = require('colors/safe');
const Errors = require('./Errors');
const Config = require('./Config');
const Identifier = require('./Identifier');
const JsonFormatter = require('./JsonFormatter');

const SPINNER_TEXT = 'Contacting the impCentral...';

const PRINTED_ENTITIES_LIMIT = 5;

const JSON_VALUE_MAX_LENGTH = 512;

const SUCCESS_COMMAND_STATUS = 'IMPT COMMAND SUCCEEDS';
const FAIL_COMMAND_STATUS = 'IMPT COMMAND FAILS';
const FAIL_EXIT_CODE = 1;

const _PRODUCT = `${Identifier.ENTITY_TYPE.TYPE_PRODUCT}`;
const _DEVICE_GROUP = `${Identifier.ENTITY_TYPE.TYPE_DEVICE_GROUP}`;
const _DEVICE_GROUPS = `${_DEVICE_GROUP}s`;
const _DEVICE = `${Identifier.ENTITY_TYPE.TYPE_DEVICE}`;
const _DEVICES = `${_DEVICE}s`;
const _DEPLOYMENT = `${Identifier.ENTITY_TYPE.TYPE_BUILD}`;
const _DEPLOYMENTS = `${_DEPLOYMENT}s`;
const _MIN_SUPPORTED_DEPLOYMENT = `Min supported ${_DEPLOYMENT}`;

const MESSAGES = {
    LOGIN_SUCCESSFUL : '%s login is successful.',
    LOGOUT_SUCCESSFUL : '%s logout is successful.',
    ENTITY_CREATED : '%s is created successfully.',
    ENTITY_UPDATED : '%s is updated successfully.',
    ENTITY_DELETED : '%s is deleted successfully.',
    ENTITY_REMOVED : '%s is removed successfully.',
    ENTITY_INFO : '%s info:',
    ENTITY_LIST : '%s list (%d items):',
    ENTITY_EMPTY_LIST : 'No %ss are found.',
    FILES_DELETED : 'Device/agent source files %s are deleted successfully.',
    DIR_DELETED : '%s %s directory is deleted successfully.',
    PROJECT_LINKED : 'Project is linked successfully.',
    CONFIG_EXISTS_CURR_DIR : 'The current directory already contains %s File. It will be overwritten.',
    CONFIG_EXISTS : '%s File %s already exists. It will be overwritten.',
    AUTH_CHOOSE_METHOD : 'Choose authentication method:',
    AUTH_FILE_EXISTS : 'The %s Auth File already exists. It will be overwritten.',
    CHOICES_CONTINUE_QUESTION : 'Are you sure you want to continue?',
    CHOICES_OPERATION_CANCELED : 'Operation is canceled.',
    CHOICES_YES_NO_PROMPT : "Enter 'y' (yes) or 'n' (no): ",
    CHOICES_INVALID_VALUE : 'Invalid value!',
    PROMPT_ENTER : 'Enter %s: ',
    RELOGIN_MSG : 'Please %s using "%s" command and then try again.',
    DELETE_CONFIG_MSG : 'Use "%s" command to delete the outdated %s.',
    NO_CONFIG_CURR_DIR_MSG : 'There is no %s File in the current directory.',
    NO_CONFIG_MSG : '%s File %s is not found.',
    DG_NO_DEVICES : `%s does not have assigned ${_DEVICES}.`,
    DG_DEVICES_RESTARTED : `Restart request for ${_DEVICES} assigned to %s is successful:`,
    DG_DEVICES_COND_RESTARTED : `Conditional restart request for ${_DEVICES} assigned to %s is successful:`,
    DG_DEVICES_UNASSIGNED : `The following ${_DEVICES} are unassigned successfully from %s:`,
    DG_DEVICES_REASSIGNED : `The following ${_DEVICES} assigned to %s are reassigned successfully to %s:`,
    DG_NO_FLAGGED_BUILDS : `No "flagged" ${_DEPLOYMENTS} are found for %s.`,
    DG_NO_BUILDS_TO_DELETE : `No ${_DEPLOYMENTS} that can be deleted are found for %s.`,
    DG_MIN_SUPPORTED_DEPLOYMENT_UPDATED : `${_MIN_SUPPORTED_DEPLOYMENT} for %s is updated successfully.`,
    DEVICE_ASSIGNED_TO_DG : '%s is assigned successfully to %s.',
    DEVICE_ALREADY_ASSIGNED_TO_DG : '%s is already assigned to %s.',
    DEVICE_REASSIGN : `%s is assigned to another ${_DEVICE_GROUP}. It will be reassigned to %s.`,
    DEVICE_RESTARTED : 'Restart request for %s is successful.',
    DEVICE_COND_RESTARTED : 'Conditional restart request for %s is successful.',
    DEVICE_UNASSIGNED : '%s is unassigned successfully.',
    DEVICE_ALREADY_UNASSIGNED : '%s is already unassigned.',
    BUILD_COPIED : '%s is copied successfully to %s.',
    BUILD_DOWNLOADED : '%s source file(s) are downloaded successfully.',
    BUILD_SOURCE_FILES_EXIST : 'Source file(s) %s already exist. They will be overwritten.',
    BUILD_RUN : '%s is run successfully.',
    BUILD_DEPLOY_FILE_NOT_SPECIFIED : '--%s option is not specified, empty %s code will be deployed.',
    LOG_GET_NEXT : 'Press <Enter> to see more logs or <Ctrl-C> to exit.',
    LOG_GET_FINISHED : 'No more logs are available.',
    LOG_STREAM_OPENED : `Log stream for ${_DEVICE}(s) %s is opened.`,
    LOG_STREAM_EXIT : 'Press <Ctrl-C> to exit.',
    LOG_STREAM_CLOSED : 'The log stream is closed.',
    LOG_STREAM_RECONNECT : 'The log stream is lost. Trying to reconnect...',
    DELETE_ENTITIES : 'The following entities will be deleted:',
    DELETE_DEVICES_UNASSIGNED : `The following ${_DEVICES} will be unassigned from ${_DEVICE_GROUPS}:`,
    DELETE_DEVICES_REMOVED : `The following ${_DEVICES} will be removed from the account:`,
    DELETE_BUILDS_FLAGGED : `The following ${_DEPLOYMENTS} are marked "flagged" to prevent deleting. They will be modified by setting "flagged" attribute to false:`,
    DELETE_FILES : 'The following files will be deleted:',
    DELETE_DIR : '%s %s directory will be deleted.',
    DELETE_CONFIG_FILE_CURR_DIR : '%s File in the current directory will be deleted.',
    DELETE_CONFIG_FILE : '%s File %s will be deleted.',
    TREE_MORE_ENTITIES : '... %d more %s(s)',
    AND_MORE_ENTITIES : 'And %d more %s(s).',
    AUTH_LOGIN_METHOD : 'Login method',
    AUTH_LOGIN_METHOD_USER_PWD : 'User/Password',
    AUTH_LOGIN_METHOD_LOGIN_KEY : 'Login Key',
    AUTH_USERNAME_OR_EMAIL : 'username or email address',
    AUTH_PASSWORD : 'password',
    AUTH_ENDPOINT : 'impCentral API endpoint',
    AUTH_FILE : 'Auth file',
    AUTH_ACCESS_TOKEN_REFRESH : 'Access token auto refresh',
    AUTH_ACCESS_TOKEN : 'Access token',
    AUTH_ACCESS_TOKEN_EXPIRED : 'expired',
    AUTH_ACCESS_TOKEN_EXPIRES_IN : 'expires in %d minutes',
    AUTH_USERNAME : 'Username',
    AUTH_EMAIL : 'Email',
    AUTH_ACCOUNT_ID : 'Account id',
};

const ERRORS = {
    CMD_REQUIRED_OPTIONS : 'Either "--%s" or "--%s" option must be specified.',
    CMD_MUTUALLY_EXCLUSIVE_OPTIONS : 'Options "--%s" and "--%s" are mutually exclusive.',
    CMD_REQUIRED_OPTION : 'Option "--%s" must be specified.',
    CMD_COOPERATIVE_OPTIONS : 'Options "--%s" and "--%s" must be specified together.',
    CMD_COOPERATIVE_MULT_OPTIONS : 'Options "--%s" or "--%s" must be specified together with "--%s".',
    CMD_TARGET_REQUIRED : `Option "--%s" must be specified for ${_DEVICE_GROUP} of type "%s".`,
    CMD_UNKNOWN_ARGS : 'Unknown arguments: %s.',
    CMD_NUMBER_REQUIRED : 'Option "--%s" must be a number.',
    CMD_POSITIVE_INT_REQUIRED : 'Option "--%s" must have a positive integer value.',
    CMD_INCORRECT_VALUE : 'Option "--%s" has incorrect value "%s".',
    CMD_MULTIPLE_OPTION : 'Option "--%s" must not be specified multiple times.',
    CMD_UNKNOWN : 'Please specify a valid command.',
    CMD_IMPOSSIBLE_TO_EXECUTE : 'Impossible to execute the command.',
    NOT_LOGGED_IN : 'You are not logged in.',
    REFRESH_TOKEN_ERR : 'Impossible to refresh access token for the %s Auth File.',
    ACCESS_TOKEN_EXPIRED : 'Access token is expired for the %s Auth File. Information required to refresh access token is not saved.',
    CONFIG_NOT_FOUND : '%s File is not found.',
    CONFIG_CORRUPTED : '%s File is corrupted.',
    CONFIG_NOT_FOUND_CURR_DIR : '%s File is not found in the current directory.',
    CONFIG_OUTDATED : '%s, saved in %s File, does not exist anymore.',
    ACCESS_FAILED : 'Access to impCentral failed or timed out. Please check your network connection.',
    PROJECT_LINK_WRONG_DG_TYPE : `Project can not be linked to ${_DEVICE_GROUP} of the type "%s". Only "%s" or "%s" ${_DEVICE_GROUPS} are allowed.`,
    TARGET_DG_NOT_FOUND : 'Production target %s is not found.',
    WRONG_DG_TYPE_FOR_OPTION : `Invalid option "--%s" for ${_DEVICE_GROUP} of the type "%s". It may be specified for "%s" or "%s" ${_DEVICE_GROUPS} only.`,
    TARGET_DG_WRONG_TYPE : 'Production target %s is of the type "%s" but must be of the type "%s".',
    TARGET_DG_WRONG_PRODUCT : `Production target ${_DEVICE_GROUP} must be from the same ${_PRODUCT}.`,
    DG_WRONG_MIN_SUPPORTED_DEPLOYMENT : `%s does not belong to %s. Impossible to set it as ${_MIN_SUPPORTED_DEPLOYMENT}.`,
    DG_OLD_MIN_SUPPORTED_DEPLOYMENT : `${_MIN_SUPPORTED_DEPLOYMENT} cannot be set to an earlier ${_DEPLOYMENT} than the current ${_MIN_SUPPORTED_DEPLOYMENT}.`,
    BUILD_DELETE_ERR : `Impossible to delete %s. It is the ${_MIN_SUPPORTED_DEPLOYMENT} or newer for %s.`,
    BUILD_DEPLOY_FILE_NOT_FOUND : 'File with IMP %s source code "%s" is not found.',
    MULTIPLE_IDENTIFIERS_FOUND : 'Multiple %ss "%s" are found:',
    MULTIPLE_IDS_FOUND : 'Multiple %ss are found:',
    NO_IDENTIFIER : 'No %s Identifier is specified.',
    ENTITY_NOT_FOUND : '%s "%s" is not found.',
    ENTITY_CORRUPTED : '%s. %s is related to corrupted %s which does not exist.',
    FILE_ERROR : 'File error: %s: %s.',
    FILE_NOT_FOUND : 'file is not found',
    INTERNAL_ERROR : 'Internal error: %s.',
    LOG_STREAM_UNEXPECTED_MSG : 'Unexpected format of log stream message: %s',
    UNEXPECTED_STATE : 'Unexpected state'
};

// Helper class for interactions with a user.
class UserInteractor {
    static get MESSAGES() {
        return MESSAGES;
    }

    static get ERRORS() {
        return ERRORS;
    }

    static get PRINTED_ENTITIES_LIMIT() {
        return PRINTED_ENTITIES_LIMIT;
    }

    static printError(message, ...args) {
        UserInteractor.spinnerStop();
        console.log('ERROR: ' + message, ...args);
    }

    static printErrorWithStatus(message, ...args) {
        UserInteractor.printError(message, ...args);
        UserInteractor.printErrorStatus();
    }

    static printErrorStatus() {
        UserInteractor.printMessage(FAIL_COMMAND_STATUS);
        process.exit(FAIL_EXIT_CODE);
    }

    static printMessage(message, ...args) {
        UserInteractor.spinnerStop();
        console.log(message, ...args);
    }

    static printMessageWithStatus(message, ...args) {
        UserInteractor.printMessage(message, ...args);
        UserInteractor.printSuccessStatus();
    }

    static printSuccessStatus() {
        UserInteractor.printMessage(SUCCESS_COMMAND_STATUS);
    }

    static printAlert(message, ...args) {
        UserInteractor.spinnerStop();
        message = Colors.red(message);
        console.log(message, ...args);
    }

    static jsonDataValueFormatter(value) {
        if (typeof(value) === 'string' && value.length > JSON_VALUE_MAX_LENGTH) {
            return value.substring(0, JSON_VALUE_MAX_LENGTH) + '\n...';
        }
        if (Array.isArray(value) && value.length === 0) {
            return '';
        }
        if (value === null || value === undefined) {
            return '';
        }
        return value;
    }

    static corruptedJsonData(data) {
        if (Array.isArray(data)) {
            return data.map(elem => UserInteractor.corruptedJsonData(elem));
        }
        else if (typeof data === 'object') {
            let result = {};
            for (let key in data) {
                result[UserInteractor.corruptedJsonData(key)] = UserInteractor.corruptedJsonData(data[key]);
            }
            return result;
        }
        return Colors.red(data);
    }

    static printJsonData(data) {
        UserInteractor.spinnerStop();
        if (!data || Array.isArray(data) && data.length === 0 || Object.keys(data).length === 0) {
            return;
        }
        const jsonFormatter = new JsonFormatter();
        console.log(jsonFormatter.render(data));
    }

    static processError(error, agentFileName, deviceFileName) {
        UserInteractor.spinnerStop();
        if (UserInteractor.debug) {
            UserInteractor.printMessage(error);
        }
        const globalExecutableName = require('./Options').globalExecutableName;

        if (error instanceof Errors.InternalLibraryError) {
            UserInteractor.printErrorWithStatus(UserInteractor.ERRORS.INTERNAL_ERROR, 
                error.message || UserInteractor.ERRORS.UNEXPECTED_STATE);
        }
        else if (error instanceof Errors.RefreshTokenError) {
            UserInteractor.printError(UserInteractor.ERRORS.REFRESH_TOKEN_ERR, error._authConfig.location);
            UserInteractor.reloginMessage(error._authConfig);
            UserInteractor.printErrorStatus();
        }
        else if (error instanceof Errors.AccessTokenExpiredError) {
            UserInteractor.printError(UserInteractor.ERRORS.ACCESS_TOKEN_EXPIRED, error._authConfig.location);
            UserInteractor.reloginMessage(error._authConfig);
            UserInteractor.printErrorStatus();
        }
        else if (error instanceof Errors.EntityNotFoundError) {
            UserInteractor.printErrorWithStatus(UserInteractor.ERRORS.ENTITY_NOT_FOUND, error._entityType, error._identifier);
        }
        else if (error instanceof Errors.CorruptedRelatedEntityError) {
            UserInteractor.printError(UserInteractor.ERRORS.ENTITY_CORRUPTED, 
                UserInteractor.ERRORS.UNEXPECTED_STATE, error._relatedIdentifier, error._identifier);
        }
        else if (error instanceof Errors.OutdatedConfigEntityError) {
            UserInteractor.printError(UserInteractor.ERRORS.CONFIG_OUTDATED, error._identifier, error._configType);
            UserInteractor.printMessage(UserInteractor.ERRORS.CMD_IMPOSSIBLE_TO_EXECUTE);
            UserInteractor.deleteOutdatedConfigMessage(error._configType);
            UserInteractor.printErrorStatus();
        }
        else if (error instanceof Errors.NotUniqueIdentifierError) {
            if (error._identifier) {
                UserInteractor.printError(UserInteractor.ERRORS.MULTIPLE_IDENTIFIERS_FOUND, error._entityType, error._identifier);
            }
            else {
                UserInteractor.printError(UserInteractor.ERRORS.MULTIPLE_IDS_FOUND, error._entityType);
            }
            UserInteractor.printJsonData(error._entitiesInfo);
            UserInteractor.printMessage(UserInteractor.ERRORS.CMD_IMPOSSIBLE_TO_EXECUTE);
            UserInteractor.printErrorStatus();
        }
        else if (error instanceof Errors.NoIdentifierError) {
            UserInteractor.printErrorWithStatus(UserInteractor.ERRORS.NO_IDENTIFIER, error._entityType);
        }
        else if (error instanceof Errors.NoOptionError) {
            UserInteractor.printErrorWithStatus(UserInteractor.ERRORS.CMD_REQUIRED_OPTION, error._option);
        }
        else if (error instanceof Errors.NoConfigError) {
            if (error._config.type === Config.TYPE.AUTH) {
                if (error._isLogout) {
                    UserInteractor.printError(UserInteractor.ERRORS.CONFIG_NOT_FOUND, error._config.info);
                }
                else {
                    UserInteractor.printError(UserInteractor.ERRORS.NOT_LOGGED_IN);
                    UserInteractor.reloginMessage(error._config);
                }
            }
            else {
                UserInteractor.printError(UserInteractor.ERRORS.CONFIG_NOT_FOUND_CURR_DIR, error._config.type);
            }
            UserInteractor.printErrorStatus();
        }
        else if (error instanceof Errors.CorruptedConfigError) {
            UserInteractor.printError(UserInteractor.ERRORS.CONFIG_CORRUPTED, error._config.info);
            if (error._config.type === Config.TYPE.AUTH) {
                UserInteractor.reloginMessage(error._config);
            }
            UserInteractor.printErrorStatus();
        }
        else if (error instanceof Errors.FileError) {
            UserInteractor.printErrorWithStatus(UserInteractor.ERRORS.FILE_ERROR, error._fileName, error.message);
        }
        else if (error instanceof Errors.OperationCanceled) {
            UserInteractor.printMessage(UserInteractor.MESSAGES.CHOICES_OPERATION_CANCELED);
            UserInteractor.printErrorStatus();
        }
        else if (error instanceof ImpCentralApi.Errors.ImpCentralApiError) {
            UserInteractor.printImpCentralApiError(error, agentFileName, deviceFileName);
            UserInteractor.printErrorStatus();
        }
        else if (error instanceof ImpCentralApi.Errors.InvalidDataError) {
            const message = error.message;
            if (message.indexOf('ENOENT') >= 0 || message.indexOf('ETIMEDOUT') >= 0 ||
                message.indexOf('ECONNRESET') >= 0) {
                UserInteractor.printErrorWithStatus(UserInteractor.ERRORS.ACCESS_FAILED);
            }
            else {
                UserInteractor.printErrorWithStatus("%s.", message);
            }
        }
        else {
            UserInteractor.printErrorWithStatus(error.message);
        }
    }

    static printImpCentralApiError(error, agentFileName, deviceFileName) {
        if (error.body && error.body.hasOwnProperty('errors')) {
            UserInteractor._printErrorsAndWarnings(error.body.errors, agentFileName, deviceFileName);
        }
        else {
            UserInteractor.printError(error.message);
        }
    }

    static printResponseMeta(response) {
        if (response && response.hasOwnProperty('data') && response.data.hasOwnProperty('meta')) {
            UserInteractor._printErrorsAndWarnings(response.data.meta);
        }
    }

    static _printErrorsAndWarnings(entities, agentFileName, deviceFileName) {
        if (Array.isArray(entities)) {

            entities.forEach((entity) => {
                if (['title', 'detail', 'status'].every(prop => entity.hasOwnProperty(prop))) {

					if(entity.title === "Compilation Error"){
						entity.meta.forEach((meta) => {
							var file = meta.file === "agent_code" ? agentFileName : deviceFileName
							UserInteractor.printMessage(file + ":" + meta.row + ":" + meta.column)
						})
					}

                    const message = entity.title + ': ' + entity.detail;
                    if (UserInteractor._isError(entity)) {
                        UserInteractor.printError(message);
                    }
                    else {
                        UserInteractor.printMessage(message);
                    }
                }
                UserInteractor._printMeta(entity.meta);
            });
        }
    }

    static _printMeta(metaData) {
        if (Array.isArray(metaData)) {
            for (let meta of metaData) {
                if (['row', 'column', 'text', 'type', 'file'].every(prop => meta.hasOwnProperty(prop))) {
                    UserInteractor.printMessage('%s %s (line %d, column %d): %s', meta.file, meta.type, meta.row, meta.column, meta.text);
                }
            }
        }
    }

    static _isError(entity) {
        const status = parseInt(entity.status);
        return (status < 200 || status >= 300);
    }

    static reloginMessage(authConfig) {
        const Options = require('./Options');
        const AuthConfig = require('./AuthConfig');
        const globalExecutableName = Options.globalExecutableName;
        let loginCommand = Util.format('%s auth login', globalExecutableName);
        if (authConfig.location !== AuthConfig.LOCATION.GLOBAL) {
            let localOption = Util.format('--%s', Options.LOCAL);
            if (authConfig.location === AuthConfig.LOCATION.ANY) {
                localOption = Util.format('[%s]', localOption);
            }
            loginCommand = Util.format('%s %s', loginCommand, localOption);
        }
        const action = authConfig.exists() ? 'relogin' : 'login';
        UserInteractor.printMessage(UserInteractor.MESSAGES.RELOGIN_MSG, action, loginCommand);
    }

    static deleteOutdatedConfigMessage(configType) {
        const globalExecutableName = require('./Options').globalExecutableName;
        const configDeleteCmd = Util.format('%s %s delete', 
            globalExecutableName, configType === Config.TYPE.PROJECT ? 'project' : 'test');
        UserInteractor.printMessage(UserInteractor.MESSAGES.DELETE_CONFIG_MSG,
            configDeleteCmd, configType);
    }

    static printEntities(entities) {
        if (entities.length > 0) {
            const entitiesToPrint = entities.slice(0, PRINTED_ENTITIES_LIMIT);
            UserInteractor.printJsonData(entitiesToPrint.map(entity => entity.displayData));
            if (entitiesToPrint.length < entities.length) {
                UserInteractor.printMessage(UserInteractor.MESSAGES.AND_MORE_ENTITIES,
                    entities.length - entitiesToPrint.length, entities[0].entityType);
            }
        }
    }

    static _callChoiceHandler(handler, handlersParams) {
        if (Array.isArray(handlersParams)) {
            return handler(...handlersParams);
        }
        else {
            return handler(handlersParams);
        }
    }

    static _cancelOperation() {
        return Promise.reject(new Errors.OperationCanceled());
    }

    static processCancelContinueChoice(message, continueChoiceHandler, continueChoiceHandlerParams, confirmed, printMsg = true) {
        const valueValidator = function (value) {
            const val = value.trim().toLowerCase();
            if (val === 'y') {
                return 1;
            }
            else if (val === 'n') {
                return 0;
            }
            return -1;
        };
        return UserInteractor._processChoice(
            message,
            UserInteractor.MESSAGES.CHOICES_CONTINUE_QUESTION,
            UserInteractor.MESSAGES.CHOICES_YES_NO_PROMPT,
            valueValidator,
            [UserInteractor._cancelOperation, continueChoiceHandler],
            continueChoiceHandlerParams,
            confirmed,
            1);
    }

    static processNumericChoice(message, choices, choicesHandlers, handlersParams) {
        let question = '';
        for (let i = 0; i < choices.length; i++) {
            question += Util.format('  (%d) %s\n', i + 1, choices[i]);
        }
        const choicesIndices = new Array(choices.length);
        for (let i = 0; i < choices.length; i++) {
            choicesIndices[i] = i + 1;
        }
        const prompt = Util.format(UserInteractor.MESSAGES.PROMPT_ENTER, choicesIndices.join(' or '));
        const valueValidator = function (value) {
            if (value && value >= 1 && value <= choices.length) {
                return value - 1;
            }
            return -1;
        };
        return UserInteractor._processChoice(
            message,
            question,
            prompt,
            valueValidator,
            choicesHandlers,
            handlersParams,
            false,
            0);
    }

    static _processChoice(message, question, prompt, valueValidator, 
        choicesHandlers, handlersParams, confirmed, confirmedHandlerIndex, printMsg = true) {
        if (confirmed) {
            return UserInteractor._callChoiceHandler(choicesHandlers[confirmedHandlerIndex], handlersParams);
        }
        else {
            if (printMsg) {
                if (message) {
                    UserInteractor.printMessage(message);
                }
                UserInteractor.printMessage(question);
            }
            return UserInteractor.prompt(prompt).
                then((value) => {
                    UserInteractor.printMessage('');
                    const choiceIndex = valueValidator(value);
                    if (choiceIndex >= 0) {
                        return UserInteractor._callChoiceHandler(choicesHandlers[choiceIndex], handlersParams);
                    }
                    else {
                        UserInteractor.printMessage(UserInteractor.MESSAGES.CHOICES_INVALID_VALUE);
                        return UserInteractor._processChoice(message, question, prompt, valueValidator, 
                            choicesHandlers, handlersParams, confirmed, confirmedHandlerIndex, false);
                    }
                });
        }
    }

    static prompt(message, hideInput = false) {
        return new Promise((resolve, reject) => {
            let value = Prompt(message, null, hideInput ? { echo : '' } : null);
            if (value) {
                resolve(value);
            }
            else if (value === null) {
                resolve(UserInteractor._cancelOperation());
            }
            else {
                UserInteractor.printMessage(UserInteractor.MESSAGES.CHOICES_INVALID_VALUE);
                resolve(UserInteractor.prompt(message, hideInput));
            }
        });
    }

    static get spinner() {
        if (!UserInteractor._spinner) {
            UserInteractor._spinner = new CliSpinner(SPINNER_TEXT);
            UserInteractor._spinner.setSpinnerString('|/-\\');
        }
        return UserInteractor._spinner;
    }

    static enableSpinner(value) {
        UserInteractor._enableSpinner = value;
    }

    static spinnerStart() {
        if (UserInteractor._enableSpinner && !UserInteractor.spinner.isSpinning()) {
            UserInteractor.spinner.start();
        }
    }

    static spinnerStop() {
        if (UserInteractor.spinner.isSpinning()) {
            UserInteractor.spinner.stop(true);
        }
    }

    static get debug() {
        return UserInteractor._debug;
    }

    static set debug(value) {
        UserInteractor._debug = value;
        if (value) {
            UserInteractor.enableSpinner(false);
        }
    }
}

UserInteractor._enableSpinner = true;
UserInteractor._debug = false;

module.exports = UserInteractor;
