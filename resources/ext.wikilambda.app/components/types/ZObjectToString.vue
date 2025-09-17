<!--
	WikiLambda Vue component to represent ZObjects as a string.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-object-to-string">
		<div class="ext-wikilambda-app-object-to-string ext-wikilambda-app-object-to-string__parent">
			<span :class="classNames">
				<cdx-icon
					v-if="icon"
					:icon="icon"
					class="ext-wikilambda-app-object-to-string__icon"
					:icon-label="labelData.label"
				></cdx-icon><!--
				--><wl-z-object-to-string
					v-if="!isValueTerminal"
					:key-path="`${ keyPath }.${ valueKey }`"
					:object-value="objectValue[ valueKey ]"
					:edit="edit"
					@expand="expand"
				></wl-z-object-to-string>
				<template v-else><!--
					--><button
						v-if="isValueUnset"
						type="button"
						class="ext-wikilambda-app-object-to-string__blank is-red-link"
						:lang="labelData.langCode"
						:dir="labelData.langDir"
						data-testid="object-to-string-link"
						@click="expand"
					>{{ labelData.label }}</button>
					<a
						v-else-if="showLink"
						v-tooltip:top="isWikidataType ? labelData.zid : null"
						:href="link"
						:lang="labelData.langCode"
						:dir="labelData.langDir"
						data-testid="object-to-string-link"
					>{{ labelData.label }}</a>
					<span
						v-else
						data-testid="object-to-string-text"
					>{{ textValue }}</span><!--
				--></template>
			</span>
		</div><!-- Children
		--><span
			v-if="childKeys.length"
			class="ext-wikilambda-app-object-to-string__children">
				&nbsp;<span class="ext-wikilambda-app-object-to-string__divider">(</span
				><span>
				<template
					v-for="( childKey, index ) in childKeys"
					:key="childKey"
					>
					<wl-z-object-to-string
						:key-path="`${ keyPath }.${ childKey }`"
						:object-value="objectValue[ childKey ]"
						:edit="edit"
						class="ext-wikilambda-app-object-to-string__child"
						@expand="expand"
					></wl-z-object-to-string
					><span
						v-if="hasComma( index )"
						class="ext-wikilambda-app-object-to-string__divider"
						>,&nbsp;</span>
				</template>
				</span><span class="ext-wikilambda-app-object-to-string__divider">)</span>
		</span>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { mapActions, mapState } = require( 'pinia' );

const wikidataIconSvg = require( './wikidata/wikidataIconSvg.js' );
const Constants = require( '../../Constants.js' );
const errorMixin = require( '../../mixins/errorMixin.js' );
const typeMixin = require( '../../mixins/typeMixin.js' );
const zobjectMixin = require( '../../mixins/zobjectMixin.js' );
const useMainStore = require( '../../store/index.js' );
const LabelData = require( '../../store/classes/LabelData.js' );
const { hybridToCanonical } = require( '../../utils/schemata.js' );
const urlUtils = require( '../../utils/urlUtils.js' );
const icons = require( '../../../lib/icons.json' );

// Codex components
const { CdxIcon, CdxTooltip } = require( '../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-z-object-to-string',
	components: {
		'cdx-icon': CdxIcon,
		'wl-z-object-to-string': this
	},
	directives: {
		tooltip: CdxTooltip
	},
	mixins: [ errorMixin, typeMixin, zobjectMixin ],
	props: {
		keyPath: {
			type: String,
			required: true
		},
		objectValue: {
			type: [ String, Object ],
			required: true
		},
		edit: {
			type: Boolean,
			required: true
		}
	},
	data: function () {
		return {
			renderedValue: '',
			rendererRunning: false,
			rendererError: false
		};
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'getLabelData',
		'getExpectedTypeOfKey',
		'getUserLangCode',
		'getUserLangZid',
		'getRendererZid',
		'getWikidataEntityLabelData',
		'getWikidataEntityUrl'
	] ), {
		/*
		 * This component template adapts to all types and includes special
		 * behaviors for some of them. When adding special rendering rules
		 * for new types, add any special cases (if needed) in the properties:
		 * * isValueTerminal: whether the object can be represented by a link or
		 *   a text, or should fallback to another z-object-to-string instance.
		 * * isValueUnset: whether the object has a set value or is blank.
		 * * childKeys: if the object name should be followed with a collection of
		 *   comma-separated arguments in parenthesis, this will contain all the keys.
		 * * icon: icon that precedes the object value
		 * * link: link for the object value
		 * * labelData: the LabelData object with the label, its langCode and langDir
		 *
		 * Some of the ad-hoc types are:
		 *
		 * Z6/String:
		 * * isValueTerminal: true
		 * * isValueUnset: false
		 * * childKeys: []
		 * * icon: undefined
		 * * link: undefined
		 * * labelData: LabelData.fromString( object.Z6K1 )
		 *
		 * Z9/Reference:
		 * * isValueTerminal: true
		 * * isValueUnset: hasValue( object.Z9K1 )
		 * * childKeys: []
		 * * icon: undefined
		 * * link: getLinkTo( object.Z9K1 )
		 * * labelData: getLabelData( object.Z9K1 )
		 *
		 * Z18/Argument reference:
		 * * isValueTerminal: true
		 * * isValueUnset: hasValue( object.Z18K1 )
		 * * childKeys: []
		 * * icon: cdxIconFunctionArgument
		 * * link: undefined
		 * * labelData: getLabelData( object.Z18K1 )
		 *
		 * Z7/Function call
		 * * isValueTerminal: false
		 * * isValueUnset: false
		 * * childKeys: getZFunctionArguments( object )
		 * * icon: undefined
		 * * link: undefined
		 * * labelData: undefined
		 */

		/**
		 * Canonical representation of the object type/Z1K1
		 *
		 * @return {string}
		 */
		type: function () {
			return this.typeToString( this.getZObjectType( this.objectValue ), true );
		},
		/**
		 * Returns the value to represent in string format depending
		 * on the type:
		 * * In the case of function call, returns the Zid of the function.
		 * * In the case of terminal object, returns its terminal value.
		 * * In the case of any other object, returns its type.
		 * * For any items with unselected values, returns undefined
		 *
		 * @return {string|Object|undefined}
		 */
		value: function () {
			if ( this.type === Constants.Z_STRING ) {
				return this.getZStringTerminalValue( this.objectValue );
			}

			if ( this.type === Constants.Z_REFERENCE ) {
				return this.getZReferenceTerminalValue( this.objectValue ) || undefined;
			}

			if ( this.type === Constants.Z_ARGUMENT_REFERENCE ) {
				return this.getZArgumentReferenceTerminalValue( this.objectValue ) || undefined;
			}

			if ( this.isWikidataType ) {
				return this.wikidataEntityId;
			}

			if ( this.type === Constants.Z_FUNCTION_CALL ) {
				return this.objectValue[ Constants.Z_FUNCTION_CALL_FUNCTION ];
			}

			// If type is empty string, return undefined value
			return this.type || undefined;
		},
		/**
		 * Returns whether the value for this object is terminal
		 *
		 * @return {boolean}
		 */
		isValueTerminal: function () {
			return typeof this.value !== 'object';
		},
		/**
		 * Returns whether the value for this object is unset.
		 *
		 * @return {boolean}
		 */
		isValueUnset: function () {
			return this.value === undefined;
		},
		/**
		 * Returns whether the value for this object is a string
		 * successfully rendered with a render/display function.
		 *
		 * @return {boolean}
		 */
		isValueRendered: function () {
			return this.rendererZid && !this.rendererError;
		},
		/**
		 * Return the renderer function Zid, if any.
		 * Else returns undefined.
		 *
		 * @return {string|undefined}
		 */
		rendererZid: function () {
			return this.getRendererZid( this.type );
		},
		/**
		 * If the value of this object is not terminal, returns
		 * the key to build the recursive z-object-to-string.
		 *
		 * @return {string|undefined}
		 */
		valueKey: function () {
			return this.type === Constants.Z_FUNCTION_CALL ?
				Constants.Z_FUNCTION_CALL_FUNCTION :
				Constants.Z_OBJECT_TYPE;
		},

		/**
		 * If the represented object has children, returns the keys
		 * so that we can render one z-object-to-string component
		 * for each one. Children are listed after the main object
		 * value, in parenthesis, and separated with a comma between
		 * them.
		 * We render children in two cases:
		 * * It is a function call. E.g. function_name( input_one, input_two )
		 * * It is a type wiht no ad-hoc rendering. E.g. type_name( key_one, key_two )
		 *
		 * @return {Array}
		 */
		childKeys: function () {
			const isTerminalType = [
				Constants.Z_ARGUMENT_REFERENCE,
				Constants.Z_HTML_FRAGMENT,
				Constants.Z_REFERENCE,
				Constants.Z_STRING
			].includes( this.type );

			// It will have no children in parenthesis when either:
			// * The object is one of these types: string, reference, arg reference or html
			// * The object is a wikidata entity
			// * The object has a successfully rendered value
			if ( isTerminalType || this.isWikidataType || this.isValueRendered ) {
				return [];
			}

			// Function calls have their arguments as children:
			if ( this.type === Constants.Z_FUNCTION_CALL ) {
				return this.getZFunctionCallArgumentKeys( this.objectValue );
			}

			// Everything else will be nested down their object keys (except Z1K1):
			return Object.keys( this.objectValue )
				.filter( ( key ) => ( key !== Constants.Z_OBJECT_TYPE ) );
		},

		/**
		 * Returns the icon that precedes the object value, if any.
		 * Else, returns undefined.
		 *
		 * @return {string|undefined}
		 */
		icon: function () {
			if ( this.isWikidataType ) {
				return wikidataIconSvg;
			}
			if ( this.type === Constants.Z_ARGUMENT_REFERENCE ) {
				return icons.cdxIconFunctionArgument;
			}
			if ( this.type === Constants.Z_HTML_FRAGMENT ) {
				return icons.cdxIconMarkup;
			}
			return undefined;
		},

		/**
		 * Returns whether the object represented should link to somewhere
		 * or not. Only non-blank terminal strings don't have a link.
		 *
		 * @return {boolean|undefined}
		 */
		showLink: function () {
			if ( !this.isValueTerminal ) {
				// If non terminal value, exit early
				return;
			}

			return (
				this.type !== Constants.Z_STRING &&
				this.type !== Constants.Z_ARGUMENT_REFERENCE &&
				!this.isValueRendered
			);
		},

		/**
		 * Returns the link to the object if it has any.
		 *
		 * @return {string|undefined}
		 */
		link: function () {
			if ( !this.isValueTerminal ) {
				// If non terminal value, exit early
				return;
			}

			if ( this.isWikidataType ) {
				return this.getWikidataEntityUrl( this.wikidataType, this.wikidataEntityId );
			}

			return urlUtils.generateViewUrl( {
				langCode: this.getUserLangCode,
				zid: this.value
			} );
		},

		/**
		 * Returns the text value to render when there's no link to show.
		 *
		 * @return {string|undefined}
		 */
		textValue: function () {
			return this.type === Constants.Z_STRING ?
				this.$i18n( 'quotation-marks', this.value ).text() :
				( this.renderedValue || this.labelData.label );
		},

		/**
		 * Returns the LabelData object for this object:
		 * * When value is unset, we generate a placeholder (edit or view)
		 * * When value is a set wikidata entity, we build the label for the wikidata Id
		 * * Else, we generate the label for the value
		 * We must make sure that labelData is always set
		 *
		 * @return {LabelData}
		 */
		labelData: function () {
			let labelData;

			if ( this.isValueUnset ) {
				labelData = this.placeholder;
			} else if ( this.isWikidataType && !!this.wikidataEntityId ) {
				labelData = this.wikidataLabelData;
			} else if ( this.isValueTerminal ) {
				labelData = this.getLabelData( this.value );
			}

			return labelData || this.getLabelData( this.type );
		},

		/**
		 * Returns a type-dependent placeholder to be printed in
		 * cases of undefined values.
		 * * In edit mode: shows call to action "Select <Type>"
		 * * In read mode: shows the name of the type "<Type>"
		 *
		 * @return {string|undefined}
		 */
		placeholder: function () {
			if ( !this.isValueTerminal ) {
				// If non terminal value, exit early
				return;
			}

			let missingType = this.type;
			if ( missingType === Constants.Z_FUNCTION_CALL ) {
				missingType = Constants.Z_FUNCTION;
			}
			if ( Constants.RESOLVER_TYPES.includes( missingType ) ) {
				missingType = this.getExpectedTypeOfKey( this.key );
			}
			if ( this.isWikidataType ) {
				missingType = this.wikidataType;
			}

			const labelData = this.getLabelData( missingType || Constants.Z_OBJECT );
			const ctaMessage = this.$i18n( 'wikilambda-zobject-to-string-select-object', labelData.label ).text();
			return this.edit ? LabelData.fromString( ctaMessage ) : labelData;
		},

		/**
		 * Returns special class names for:
		 * * Text value showing ongoing rendering label
		 * * Label that contains an icon component
		 *
		 * @return {Object}
		 */
		classNames: function () {
			return {
				'ext-wikilambda-app-object-to-string--rendering': this.rendererRunning,
				'ext-wikilambda-app-object-to-string--with-icon': this.icon
			};
		},

		/**
		 * Returns whether the object is a Wikidata entity.
		 *
		 * @return {boolean}
		 */
		isWikidataType: function () {
			return this.isWikidataEntity( this.objectValue );
		},
		/**
		 * Returns the Wikidata type for the object represented
		 * in this component, or undefined if it is not a Wikidata type.
		 *
		 * @return {string|undefined}
		 */
		wikidataType: function () {
			const wikidataType = this.isWikidataFetch( this.objectValue ) ?
				this.getZFunctionCallFunctionId( this.objectValue ) :
				this.type;
			return Constants.WIKIDATA_SIMPLIFIED_TYPES[ wikidataType ];
		},
		/**
		 * Returns the Wikidata entity ID for the object represented
		 * in this component, or undefined if it is not a Wikidata type.
		 * If the terminal wikidata entity ID is unset, returns undefined.
		 * E.g. 'L313289'
		 *
		 * @return {string|undefined}
		 */
		wikidataEntityId: function () {
			return this.isWikidataType ?
				this.getWikidataEntityId( this.objectValue, this.wikidataType ) || undefined :
				undefined;
		},
		/**
		 * Returns the label data for the Wikidata entity represented
		 * in this component.
		 *
		 * @return {LabelData|undefined}
		 */
		wikidataLabelData: function () {
			return this.getWikidataEntityLabelData( this.wikidataType, this.wikidataEntityId );
		}
	} ),
	methods: Object.assign( {}, mapActions( useMainStore, [
		'fetchWikidataEntitiesByType',
		'fetchZids',
		'runRenderer'
	] ), {
		/**
		 * Whether a ZObject child needs a trailing comma given its index
		 *
		 * @param {number} index
		 * @return {boolean}
		 */
		hasComma: function ( index ) {
			return ( index + 1 ) < this.childKeys.length;
		},

		/**
		 * Emits event 'expand' when an unselected value is clicked.
		 * This will propagate the event till the nearest ZObjectKeyValue
		 * parent, who will set the expansion flag to true.
		 */
		expand: function () {
			this.$emit( 'expand', true );
		},

		/**
		 * Trigger the call to the Renderer function for this type
		 * passing the current object values, and set the returned string
		 * in the local renderedValue variable.
		 */
		generateRenderedValue: function () {
			// Only generate rendered value once.
			// If the rendererZid is not set, we can't render anything else
			if ( this.rendererRunning || !this.rendererZid ) {
				return;
			}

			this.rendererRunning = true;
			this.renderedValue = this.$i18n( 'wikilambda-string-renderer-running' ).text();
			const zobject = hybridToCanonical( this.objectValue );

			this.runRenderer( {
				rendererZid: this.rendererZid,
				zobject,
				zlang: this.getUserLangZid
			} ).then( ( data ) => {
				const response = data.response[ Constants.Z_RESPONSEENVELOPE_VALUE ];
				if ( response === Constants.Z_VOID || this.getZObjectType( response ) !== Constants.Z_STRING ) {
					this.rendererError = true;
				} else {
					this.renderedValue = response;
					this.rendererError = false;
				}
			} ).catch( () => {
				this.rendererError = true;
			} ).finally( () => {
				this.rendererRunning = false;
			} );
		},

		/**
		 * Fetch the Wikidata entity data depending on the type of the entity
		 *
		 * @return {Promise | undefined}
		 */
		fetchWikidataEntity: function () {
			this.fetchWikidataEntitiesByType( { type: this.wikidataType, ids: [ this.wikidataEntityId ] } );
			this.fetchZids( { zids: [ this.wikidataType ] } );
		}
	} ),
	watch: {
		/**
		 * Watch the rendererZid and whenever it's updated, generate the
		 * rendered value, in case the initial generateRenderedValue call
		 * is called before the rendererZid has been fetched.
		 */
		rendererZid: function () {
			this.generateRenderedValue();
		}
	},
	mounted: function () {
		this.generateRenderedValue();
		if ( this.isWikidataType ) {
			this.fetchWikidataEntity();
		}
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-object-to-string {
	display: inline;

	.ext-wikilambda-app-object-to-string__child {
		white-space: normal;
		word-break: break-word;
	}

	.ext-wikilambda-app-object-to-string__children {
		white-space: nowrap;
	}

	.ext-wikilambda-app-object-to-string__divider {
		color: @color-subtle;
		white-space: nowrap;
	}

	.ext-wikilambda-app-object-to-string__blank {
		.cdx-mixin-link();
		border: 0;
		background: none;
		font-size: inherit;
	}

	.ext-wikilambda-app-object-to-string__icon.cdx-icon {
		padding-right: @spacing-25;
		position: relative;
		top: -1px;
		vertical-align: middle;
	}

	&--with-icon {
		white-space: nowrap;
		display: inline;

		> span,
		> a {
			white-space: pre-wrap;
		}
	}

	&--rendering {
		color: @color-placeholder;
	}
}
</style>
