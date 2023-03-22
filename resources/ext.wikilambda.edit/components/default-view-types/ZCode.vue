<template>
	<!--
		WikiLambda Vue component for Z6/String objects.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-code">
		<span v-if="!edit">{{ selectedLanguage }}</span>
		<wl-select
			v-else
			v-model:selected="selectedLanguage"
			class="ext-wikilambda-zcode__language-selector"
			:menu-items="programmingLangsList"
			:default-label="$i18n( 'wikilambda-editor-label-select-programming-language-label' ).text()"
			:fit-width="true"
			@update:selected="selectLanguage"
		>
		</wl-select>
		<code-editor
			class="ext-wikilambda-zcode__code-editor"
			:mode="selectedLanguage"
			:read-only="!edit"
			:value="editorValue"
			@change="updateCode"
		></code-editor>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	CodeEditor = require( '../base/CodeEditor.vue' ),
	Select = require( '../base/Select.vue' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions;

// @vue/component
module.exports = exports = {
	name: 'wl-z-code',
	components: {
		'code-editor': CodeEditor,
		'wl-select': Select
	},
	props: {
		rowId: {
			type: Number,
			required: false,
			default: 0
		},
		parentId: {
			type: Number,
			required: false,
			default: 0
		},
		edit: {
			type: Boolean,
			required: true
		}
	},
	data: function () {
		return {
			editorValue: '',
			allowSetEditorValue: true
		};
	},
	computed: $.extend(
		mapGetters( [
			'getAllProgrammingLangs',
			'getErrors',
			'getZCodeLanguage',
			'getZCode',
			'getZStringTerminalValue',
			'getZCodeFunction',
			'getZarguments'
		] ),
		{
			codeItem: function () {
				return this.getZCode( this.rowId );
			},
			codeValue: function () {
				return this.getZStringTerminalValue( this.codeItem.id );
			},
			zCodeProgrammingLanguage: function () {
				return this.getZCodeLanguage( this.rowId );
			},
			zCodeProgrammingValue: function () {
				return this.getZStringTerminalValue( this.zCodeProgrammingLanguage.id );
			},
			zFunction: function () {
				return this.getZCodeFunction( this.parentId );
			},
			selectedFunctionArguments: function () {
				return Object.keys( this.getZarguments ).map( function ( arg ) {
					return this.getZarguments[ arg ];
				}.bind( this ) );
			},
			selectedLanguage: {
				get: function () {
					return this.zCodeProgrammingValue || '';
				},
				set: function ( val ) {
					this.selectLanguage( val );
				}
			},
			programmingLangsList: function () {
				var programmingLangs = [];
				if ( this.getAllProgrammingLangs.length > 0 ) {
					for ( var lang in this.getAllProgrammingLangs ) {
						programmingLangs.push(
							{
								label: this.getAllProgrammingLangs[
									lang
								][
									Constants.Z_PERSISTENTOBJECT_VALUE
								][
									Constants.Z_PROGRAMMING_LANGUAGE_CODE
								],
								value: this.getAllProgrammingLangs[
									lang
								][
									Constants.Z_PERSISTENTOBJECT_VALUE
								][
									Constants.Z_PROGRAMMING_LANGUAGE_CODE
								]
							}
						);
					}
				}

				return programmingLangs;
			},
			errorState: function () {
				// the error is not guaranteed to exist
				if ( this.getErrors[ this.zobjectId ] ) {
					return this.getErrors[ this.zobjectId ].state;
				}

				return false;
			},
			errorMessage: function () {
				if ( this.getErrors[ this.zobjectId ] ) {
					const messageStr = this.getErrors[ this.zobjectId ].message;
					return this.$i18n( messageStr ).text();
				}
				return null;
			},
			errorType: function () {
				if ( this.getErrors[ this.zobjectId ] ) {
					return this.getErrors[ this.zobjectId ].type;
				}
				return null;
			}
		}
	),
	methods: $.extend(
		mapActions( [
			'fetchAllZProgrammingLanguages',
			'setError'
		] ),
		{
			/**
			 * Sets the value Z_PROGRAMMING_LANGUAGE_CODE.
			 *
			 * @param {string} value
			 */
			selectLanguage: function ( value ) {
				this.allowSetEditorValue = true;

				// update selected language
				this.$emit( 'set-value', {
					keyPath: [
						Constants.Z_CODE_LANGUAGE,
						Constants.Z_PROGRAMMING_LANGUAGE_CODE
					],
					value
				} );

				// update boiler plate code
				let updatedBoilerPlateCode = '';
				switch ( value ) {
					case 'javascript':
						updatedBoilerPlateCode = 'function ' + this.zFunction + '( ' + this.selectedFunctionArguments + ' ) {\n\n}';
						break;
					case 'python':
						updatedBoilerPlateCode = 'def ' + this.zFunction + '(' + this.selectedFunctionArguments + '):\n\t';
						break;
					case 'lua':
						updatedBoilerPlateCode = 'function ' + this.zFunction + '(' + this.selectedFunctionArguments + ')\n\t\nend';
						break;
					default:
						break;
				}

				this.$emit( 'set-value', {
					keyPath: [ Constants.Z_CODE_CODE ],
					value: updatedBoilerPlateCode
				} );
			},
			updateCode: function ( code ) {
				// there is an edge case where acejs will trigger an empty change that we process as an event object
				// we don't want to update our object with that bad data
				// TODO(T324605): this deserves a deeper investigation
				if ( typeof code !== 'object' ) {
					this.$emit( 'set-value', {
						keyPath: [ Constants.Z_CODE_CODE ],
						value: code
					} );

					this.setError( {
						internalId: this.zobjectId,
						errorState: false
					} );
				}
			}
		} ),
	watch: {
		codeValue: {
			immediate: true,
			handler: function () {
				// Check allowSetEditorValue to ensure we only set value in the editor when its current value should be
				// overriden (e.g. when the editor is first loaded, or when the language changes). Ensuring this
				// prevents a bug that moves the cursor to the end of the editor on every keypress.
				if ( this.allowSetEditorValue ) {
					this.editorValue = this.codeValue || '';
					this.allowSetEditorValue = false;
				}
			}
		}
	},
	mounted: function () {
		if ( this.getAllProgrammingLangs.length <= 0 ) {
			this.fetchAllZProgrammingLanguages();
		}
	}
};
</script>

<style lang="less">
@import '../../ext.wikilambda.edit.variables.less';

.ext-wikilambda-zcode {
	display: block;
	padding: 1em;
	outline: 1px dashed #888;
	max-width: 600px;

	&__language-selector {
		width: 200px;
		margin-bottom: @spacing-50;
	}
}

@media only screen and ( min-width: 600px ) {
	.ext-wikilambda-zcode {
		width: 600px;
	}
}
</style>
