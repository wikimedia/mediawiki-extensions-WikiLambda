<template>
	<!--
		WikiLambda Vue component for ZCode objects.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-zcode">
		<span v-if="viewmode || readonly">{{ selectedLanguage }}</span>
		<!-- eslint-disable vue/no-v-model-argument -->
		<!-- eslint-disable vue/no-unsupported-features -->
		<cdx-select
			v-model:selected="selectedLanguage"
			class="ext-wikilambda-zcode__language-selector"
			:menu-items="programmingLangsList"
			:default-label="$i18n( 'wikilambda-editor-label-select-programming-language-label' ).text()"
			@update:selected="selectLanguage"
		>
		</cdx-select>
		<code-editor
			:mode="selectedLanguage"
			:read-only="!selectedLanguage || viewmode || readonly"
			:value="codeValue"
			@change="updateCode"
		></code-editor>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	typeUtils = require( './../../mixins/typeUtils.js' ),
	CodeEditor = require( '../base/CodeEditor.vue' ),
	CdxSelect = require( '@wikimedia/codex' ).CdxSelect,
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	components: {
		'code-editor': CodeEditor,
		'cdx-select': CdxSelect
	},
	mixins: [ typeUtils ],
	inject: {
		viewmode: { default: false }
	},
	props: {
		zobjectId: {
			type: Number,
			required: true
		},
		readonly: {
			type: Boolean,
			default: false
		}
	},
	data: function () {
		return {
			codeValue: '',
			allowCodeValueOverride: true
		};
	},
	computed: $.extend(
		mapGetters( [
			'getAllProgrammingLangs',
			'getZObjectChildrenById'
		] ),
		{
			zobject: function () {
				return this.getZObjectChildrenById( this.zobjectId );
			},
			zCodeLanguage: function () {
				return this.findKeyInArray( Constants.Z_CODE_LANGUAGE, this.zobject );
			},
			zCodeProgrammingLanguage: function () {
				return this.findKeyInArray(
					Constants.Z_STRING_VALUE,
					this.getZObjectChildrenById(
						this.findKeyInArray(
							Constants.Z_PROGRAMMING_LANGUAGE_CODE,
							this.getZObjectChildrenById( this.zCodeLanguage.id )
						).id
					)
				);
			},
			zCodeProgrammingLanguageDefaultCodeValue: function () {
				return this.findKeyInArray(
					Constants.Z_STRING_VALUE,
					this.getZObjectChildrenById( this.codeItem.id )
				).value;
			},
			codeItem: function () {
				return this.findKeyInArray( Constants.Z_CODE_CODE, this.zobject );
			},
			selectedLanguage: {
				get: function () {
					return this.zCodeProgrammingLanguage.value || '';
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
			}
		} ),
	methods: $.extend(
		mapActions( [
			'fetchAllZProgrammingLanguages'
		] ),
		{
			/**
			 * Sets the value Z_PROGRAMMING_LANGUAGE_CODE.
			 *
			 * @param {string} value
			 */
			selectLanguage: function ( value ) {
				this.allowCodeValueOverride = true;

				var payload = {
					id: this.zCodeLanguage.id,
					value: value
				};
				this.$emit( 'select-language', payload );
			},
			updateCode: function ( code ) {
				var payload = {
					zobject: {
						Z1K1: Constants.Z_STRING,
						Z6K1: code
					},
					id: this.codeItem.id,
					key: Constants.Z_CODE_CODE,
					parent: this.zobjectId
				};

				this.$emit( 'update-code', payload );
			}
		} ),
	watch: {
		codeItem: {
			immediate: true,
			handler: function () {
				var codeValue;

				// Assigning the value this way prevents a bug,
				// that would move the cursor to the end of the string on every keypress
				codeValue = this.findKeyInArray(
					Constants.Z_STRING_VALUE,
					this.getZObjectChildrenById( this.codeItem.id )
				);
				if ( codeValue && this.allowCodeValueOverride ) {
					this.codeValue = codeValue.value;
					this.allowCodeValueOverride = false;
				}
			}
		},
		// the default code changes only when the programming language has changed
		// in which case we reset the code
		zCodeProgrammingLanguageDefaultCodeValue: {
			immediate: true,
			handler: function () {
				this.codeValue = this.zCodeProgrammingLanguageDefaultCodeValue || '';
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
.ext-wikilambda-zcode {
	display: block;
	padding: 1em;
	outline: 1px dashed #888;
	max-width: 600px;

	&__language-selector {
		width: 200px;
		z-index: 100;
	}
}

@media only screen and ( min-width: 600px ) {
	.ext-wikilambda-zcode {
		width: 600px;
	}
}
</style>
