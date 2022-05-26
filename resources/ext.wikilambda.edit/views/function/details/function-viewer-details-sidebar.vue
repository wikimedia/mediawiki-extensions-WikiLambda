<template>
	<div class="ext-wikilambda-function-viewer-details-sidebar">
		<table-container
			class="ext-wikilambda-function-viewer-details-sidebar__table"
			:header="header"
			:body="formattedDataList"
			:hide-header="true"
		>
		</table-container>
		<cdx-button
			class="ext-wikilambda-function-viewer-details-sidebar__button"
			@click="showAllLangs = !showAllLangs"
		>
			<cdx-icon :icon="buttonIcon"></cdx-icon>
			{{ buttonText }}
		</cdx-button>
		<div class="ext-wikilambda-function-viewer-details-sidebar__summary">
			{{ $i18n( 'wikilambda-function-viewer-details-sidebar-summary' ).text() }}
		</div>
		<div class="ext-wikilambda-function-viewer-details-sidebar__links">
			<!-- TODO (T309200): update to use correct links-->
			<div class="ext-wikilambda-function-viewer-details-sidebar__link">
				<a href="#"> {{ $i18n( 'wikilambda-implementation-create-new' ).text() }} </a>
			</div>
			<div>
				<a href="#"> {{ $i18n( 'wikilambda-tester-create-new' ).text() }} </a>
			</div>
		</div>
	</div>
</template>

<script>
var TableContainer = require( '../../../components/base/Table.vue' ),
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	mapGetters = require( 'vuex' ).mapGetters,
	Constants = require( '../../../Constants.js' ),
	CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	typeUtils = require( '../../../mixins/typeUtils.js' ),
	icons = require( '../../../../lib/icons.json' );

// @vue/component
module.exports = exports = {
	name: 'function-viewer-details-sidebar',
	components: {
		'table-container': TableContainer,
		'cdx-button': CdxButton,
		'cdx-icon': CdxIcon
	},
	mixins: [ typeUtils ],
	props: {
		zobjectId: {
			type: Number,
			default: 0
		}
	},
	data: function () {
		return {
			header: {
				label: '',
				language: '',
				text: ''
			},
			showAllLangs: false
		};
	},
	computed: $.extend( mapGetters( [
		'getZObjectChildrenById',
		'getNestedZObjectById',
		'getZkeyLabels',
		'getCurrentZLanguage',
		'getZObjectTypeById',
		'getCurrentZObjectId'
	] ), {
		// format inputs/output to pass to the table in expected format
		formattedDataList: function () {
			var tableData = [ {
				label: {
					title: this.$i18n( 'wikilambda-editor-fn-step-function-definition' ).text(),
					component: 'span',
					props: {
						class: 'ext-wikilambda-function-viewer-details-sidebar__table-bold'
					},
					class: 'ext-wikilambda-function-viewer-details-sidebar__table__header ext-wikilambda-function-viewer-details-sidebar__table__expanded'
				},
				text: {
					title: this.$i18n( 'wikilambda-edit' ).text(),
					component: 'cdx-button',
					props: {
						class: 'ext-wikilambda-function-viewer-details-sidebar__table-bold',
						type: 'quiet',
						action: 'progressive',
						onClick: this.handleEditClick
					},
					class: 'ext-wikilambda-function-viewer-details-sidebar__table__header'
				}
			} ];

			// for each input to the function
			for ( var argumentIndex in this.zArgumentList ) {
				// set the global argument ID to look up type and label
				var argumentId = this.zArgumentList[ argumentIndex ].id;
				var zArgumentType = this.zArgumentType( argumentId );

				// Corresponding to "INPUT X" in a row
				tableData.push( {
					label: {
						// only show the numbered input if there is more than one
						title: this.$i18n( 'wikilambda-function-viewer-details-input-number', this.zArgumentList.length > 1 ? Number( argumentIndex ) + 1 : '' ).text(),
						component: 'div',
						props: {
							class: 'ext-wikilambda-function-viewer-details-sidebar__table-bold'
						},
						class: argumentIndex > 0 ? 'ext-wikilambda-function-viewer-details-sidebar__table-bordered-row' : 'ext-wikilambda-function-viewer-details-sidebar__table-borderless-row'
					},
					language: {
						title: '',
						class: argumentIndex > 0 ? 'ext-wikilambda-function-viewer-details-sidebar__table-bordered-row' : 'ext-wikilambda-function-viewer-details-sidebar__table-borderless-row'
					},
					text: {
						title: this.zArgumentTypeLabel( zArgumentType ),
						component: 'a',
						props: {
							href: '/wiki/' + zArgumentType
						},
						class: argumentIndex > 0 ? 'ext-wikilambda-function-viewer-details-sidebar__table-bordered-row' : 'ext-wikilambda-function-viewer-details-sidebar__table-borderless-row'
					}
				} );

				// get the label for each input
				var stringData = this.monolingualStrings( argumentId ).map( function ( item ) {
					var multilingualObject = this.getZObjectChildrenById( item.id );
					var monolingualStringLanguage = this.monolingualStringLanguage( multilingualObject );
					var monolingualStringValue = this.monolingualStringValue( multilingualObject );

					// if the label is not in the users current language
					if ( monolingualStringLanguage === this.getCurrentZLanguage ) {
						// Corresponding to a "LABEL" row that has a language label chip
						return {
							label: {
								title: this.$i18n( 'wikilambda-metadata-label-column' ).text(),
								component: 'span',
								props: {
									class: 'ext-wikilambda-function-viewer-details-sidebar__table-bold'
								},
								class: 'ext-wikilambda-function-viewer-details-sidebar__table-borderless-row'
							},
							language: {
								title: '',
								component: 'span',
								class: 'ext-wikilambda-function-viewer-details-sidebar__table-borderless-row'
							},
							text: {
								title: monolingualStringValue.value,
								component: 'span',
								props: {
									class: 'ext-wikilambda-function-viewer-details-sidebar__table-small'
								},
								class: 'ext-wikilambda-function-viewer-details-sidebar__table-borderless-row'
							}
						};
					} else if ( this.showAllLangs ) {
						// corresponding to a "LABEL" row in the user's current language (no language chip)
						return {
							label: {
								title: this.$i18n( 'wikilambda-metadata-label-column' ).text(),
								component: 'span',
								props: {
									class: 'ext-wikilambda-function-viewer-details-sidebar__table-bold'
								},
								class: 'ext-wikilambda-function-viewer-details-sidebar__table-borderless-row'
							},
							language: {
								component: 'chip',
								props: {
									editableContainer: false,
									readonly: true,
									text: this.languageLabel( monolingualStringLanguage )
								},
								class: 'ext-wikilambda-function-viewer-details-sidebar__table-borderless-row'
							},
							text: {
								title: monolingualStringValue.value,
								component: 'span',
								props: {
									class: 'ext-wikilambda-function-viewer-details-sidebar__table-small'
								},
								class: 'ext-wikilambda-function-viewer-details-sidebar__table-borderless-row'
							}
						};
					}
				}.bind( this ) );

				tableData = tableData.concat( stringData );
			}

			// create a row for the function output
			tableData.push( {
				label: {
					title: this.$i18n( 'wikilambda-editor-output-title' ).text(),
					component: 'span',
					props: {
						class: 'ext-wikilambda-function-viewer-details-sidebar__table-bold'
					},
					class: 'ext-wikilambda-function-viewer-details-sidebar__table-bordered-row'
				},
				language: {
					title: '',
					class: 'ext-wikilambda-function-viewer-details-sidebar__table-bordered-row'
				},
				text: {
					title: this.zReturnTypeLabel,
					component: 'a',
					props: {
						href: '/wiki/' + this.zReturnType
					},
					class: 'ext-wikilambda-function-viewer-details-sidebar__table-bordered-row'
				}
			} );
			return tableData;
		},

		// START OF ARGUMENTS HELPER FUNCTIONS //
		/* get the list of arguments for the current argument ID */
		zArgumentList: function () {
			return this.getZObjectChildrenById( this.zArgumentId );
		},
		/* get the zArgumentId */
		zArgumentId: function () {
			return this.getNestedZObjectById( this.zobjectId, [
				Constants.Z_PERSISTENTOBJECT_VALUE,
				Constants.Z_FUNCTION_ARGUMENTS
			] ).id || Constants.NEW_ZID_PLACEHOLDER;
		},
		// END OF ARGUMENTS HELPER FUNCTIONS //

		/* get the ZID of the return type of the output */
		zReturnType: function () {
			return this.getNestedZObjectById( this.zobjectId, [
				Constants.Z_PERSISTENTOBJECT_VALUE,
				Constants.Z_FUNCTION_RETURN_TYPE,
				Constants.Z_REFERENCE_ID
			] ).value;
		},
		/* get the plaintext label of the return type of the output */
		zReturnTypeLabel: function () {
			return this.getZkeyLabels[ this.zReturnType ];
		},
		// functions for correct icon/text for language button
		buttonText: function () {
			if ( this.showAllLangs ) {
				return this.$i18n( 'wikilambda-function-viewer-aliases-hide-language-button' ).text();
			}
			return this.$i18n( 'wikilambda-function-viewer-aliases-show-language-button' ).text();
		},
		buttonIcon: function () {
			if ( this.showAllLangs ) {
				return icons.cdxIconCollapse;
			}
			return icons.cdxIconLanguage;
		}
	} ),
	methods: $.extend( {},
		{
			handleEditClick: function () {
				window.location.href = new mw.Title( this.getCurrentZObjectId ).getUrl() + '?view=function-editor';
			},
			/* get the ZID of the argument type */
			zArgumentType: function ( argumentId ) {
				var zArgumentTypeId = this.getNestedZObjectById( argumentId, [
					Constants.Z_ARGUMENT_TYPE
				] ).id;

				if ( this.getZObjectTypeById( zArgumentTypeId ) === Constants.Z_REFERENCE ) {
					return this.getNestedZObjectById( zArgumentTypeId, [
						Constants.Z_REFERENCE_ID
					] ).value;
				} else if ( this.getZObjectTypeById( zArgumentTypeId ) === Constants.Z_TYPED_LIST ) {
					return Constants.Z_TYPED_LIST;
				}

				return null;
			},
			/* get the plaintext label for the argument type */
			zArgumentTypeLabel: function ( zArgumentType ) {
				return this.getZkeyLabels[ zArgumentType ];
			},
			/* get the list of string labels for the current argument input */
			monolingualStrings: function ( argumentId ) {
				/* get the argument ZObject for the current argument ID */
				var argumentZobject = this.getZObjectChildrenById( argumentId );

				/* get the ID of the label from the current argument ZObject */
				var argumentLabels = this.findKeyInArray( Constants.Z_ARGUMENT_LABEL, argumentZobject );
				if ( !argumentLabels.id ) {
					return;
				}

				/* get the zObject for the current argument input */
				var monolingualZObject = this.getZObjectChildrenById( argumentLabels.id );

				/* get the ID for the list of string labels for the current argument input */
				var monolingualStringItem = this.findKeyInArray(
					Constants.Z_MULTILINGUALSTRING_VALUE,
					monolingualZObject
				);
				if ( monolingualStringItem.id ) {
					return this.getZObjectChildrenById( monolingualStringItem.id );
				}
				return null;
			},
			/* get the ZID of the text of the monolingual string */
			monolingualStringValue: function ( multilingualObject ) {
				var item = this.findKeyInArray( Constants.Z_MONOLINGUALSTRING_VALUE, multilingualObject );

				if ( item.value === 'object' ) {
					item = this.findKeyInArray(
						Constants.Z_STRING_VALUE,
						this.getZObjectChildrenById(
							item.id
						)
					);
				}
				return item;
			},
			/* language ZID -> language plain text in current user language */
			languageLabel: function ( monolingualStringLanguage ) {
				return this.getZkeyLabels[ monolingualStringLanguage ];
			},
			/* get the ZID of the language of the monolingual string */
			monolingualStringLanguage: function ( multilingualObject ) {
				var item = this.findKeyInArray( Constants.Z_MONOLINGUALSTRING_LANGUAGE, multilingualObject );

				if ( item.value === 'object' ) {
					item = this.findKeyInArray(
						Constants.Z_REFERENCE_ID,
						this.getZObjectChildrenById(
							item.id
						)
					);
				}

				return item.value;
			}
		}
	)
};
</script>

<style lang="less">
@import '../../../ext.wikilambda.edit.less';

.ext-wikilambda-function-viewer-details-sidebar {
	width: 250px;

	&__summary:extend(.ext-wikilambda-edit__text-regular) {
		color: @wmui-color-base30;
		margin-top: 30px;
	}

	&__button {
		margin-top: 30px;
	}

	&__link {
		padding-bottom: 16px;
	}

	&__links {
		padding-top: 20px;
	}

	&__table {
		border: 0;
		width: 100%;
		table-layout: fixed;

		&__header {
			max-height: 40px;
			border-top: 0;

			.cdx-button {
				padding: 0;
				margin-right: 0;
				margin-left: auto;
			}
		}

		&__expanded {
			grid-column: ~'1/-2';
		}

		&-title {
			font-weight: @font-weight-bold;
			padding: 5px 16px;
			color: @wmui-color-base0;
			display: flex;
			justify-content: space-between;
			align-items: center;
		}

		&-borderless-row {
			border-top: 0;
			margin-top: 8px;
			max-height: 30px;
		}

		&-bordered-row {
			margin-top: 15px;
			max-height: 30px;
			padding-top: 10px;
		}

		&-bold {
			font-weight: @font-weight-bold;
		}

		&-small {
			word-break: break-word;
		}
	}
}
</style>
