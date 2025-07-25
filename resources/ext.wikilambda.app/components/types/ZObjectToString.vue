<!--
	WikiLambda Vue component to represent ZObjects as a string.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div
		v-if="( !rendererZid || rendererError ) && hasLink"
		class="ext-wikilambda-app-object-to-string"
		data-testid="object-to-string-link">
		<div class="ext-wikilambda-app-object-to-string">
			<a
				v-if="isBlank"
				class="ext-wikilambda-app-object-to-string__blank is-red-link"
				:lang="labelData.langCode"
				:dir="labelData.langDir"
				@click="expand"
			>{{ labelData.label }}</a>
			<span v-else class="ext-wikilambda-app-object-to-string__icon-label">
				<cdx-icon
					v-if="icon"
					:icon="icon"
					class="ext-wikilambda-app-object-to-string__icon"
					:icon-label="labelData.label"></cdx-icon><!--
			--><a
					v-tooltip:top="isWikidataType ? labelData.zid : null"
					:href="link"
					:lang="labelData.langCode"
					:dir="labelData.langDir">{{ labelData.label }}</a>
			</span>
		</div
		><span
			v-if="hasChildren"
			class="ext-wikilambda-app-object-to-string__children">
			&nbsp;<span class="ext-wikilambda-app-object-to-string__divider">(</span
			><span class="ext-wikilambda-app-object-to-string__child">
				<template
					v-for="( childKey, index ) in childKeys"
					:key="childKey"
				>
					<wl-z-object-to-string
						:key-path="`${ keyPath }.${ childKey }`"
						:object-value="objectValue[ childKey ]"
						:edit="edit"
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
	<div
		v-else
		:class="{ 'ext-wikilambda-app-object-to-string--rendering': rendererRunning }"
		class="ext-wikilambda-app-object-to-string"
		data-testid="object-to-string-text"
		:lang="labelData.langCode"
		:dir="labelData.langDir"
	>
		<span class="ext-wikilambda-app-object-to-string__icon-label">
			<cdx-icon
				v-if="icon"
				:icon="icon"
				class="ext-wikilambda-app-object-to-string__icon"
				:icon-label="labelData.label"></cdx-icon><!--
		--><span v-if="icon">{{ labelData.label }}</span><!--
		--><span v-else>{{ renderedValue || `"${labelData.label}"` }}</span>
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
		/**
		 * Returns the type of the value of the the ZObject represented
		 * in this component. Depending on the type, we will decide what
		 * kind of string representation to create:
		 *
		 * Z6/String:
		 * * value: this.Z6K1
		 * * label: this.value
		 * * link: -
		 *
		 * Z9/Reference:
		 * * value: this.Z9K1
		 * * label: this.value | getLabelData.label
		 * * link: this.value | toLink
		 *
		 * Z7/Function call:
		 * * value: this.Z7K1
		 * * label: this.value | getLabelData.label
		 * * link: this.value | toLink
		 * * children: all child values except Z1K1 and Z7K1
		 *
		 * Any other object:
		 * * value: this.type
		 * * label: this.value | getLabelData.label
		 * * link: this.value | getLink
		 * * children: all child values except Z1K1
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
		 *
		 * @return {string|undefined}
		 */
		value: function () {
			switch ( this.type ) {
				case Constants.Z_FUNCTION_CALL:
					return this.getZFunctionCallFunctionId( this.objectValue ) || undefined;
				case Constants.Z_STRING:
					return this.getZStringTerminalValue( this.objectValue );
				case Constants.Z_REFERENCE:
					return this.getZReferenceTerminalValue( this.objectValue ) || undefined;
				case Constants.Z_ARGUMENT_REFERENCE:
					return this.getZArgumentReferenceTerminalValue( this.objectValue ) || undefined;
				default:
					return this.type;
			}
		},

		/**
		 * Returns the LabelData object for this object.
		 * If value is undefined, we generate the placeholder depending
		 * on its type.
		 *
		 * @return {LabelData}
		 */
		labelData: function () {
			if ( this.isBlank ) {
				return LabelData.fromString( this.placeholder );
			}
			if ( this.isWikidataType ) {
				return this.wikidataLabelData;
			}
			return this.getLabelData( this.value );
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
			return Constants.WIKIDATA_SIMPLIFIED_TYPES[ this.value ];
		},

		/**
		 * Returns the Wikidata entity ID for the object represented
		 * in this component, or undefined if it is not a Wikidata type.
		 * E.g. 'L313289'
		 *
		 * @return {string|undefined}
		 */
		wikidataEntityId: function () {
			if ( !this.isWikidataType ) {
				return undefined;
			}
			return this.getWikidataEntityId( this.objectValue, this.wikidataType );
		},

		/**
		 * Returns the label data for the Wikidata entity represented
		 * in this component.
		 *
		 * @return {LabelData}
		 */
		wikidataLabelData: function () {
			return this.getWikidataEntityLabelData( this.wikidataType, this.wikidataEntityId ) ||
				this.getLabelData( this.value );
		},

		/**
		 * Returns the link to the object if it has any.
		 *
		 * @return {string}
		 */
		link: function () {
			if ( !this.hasLink || this.isBlank ) {
				return '';
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
		 * Returns the expected (or bound) type for the value of
		 * the key-value pair represented in this component.
		 *
		 * @return {string}
		 */
		expectedType: function () {
			return this.getExpectedTypeOfKey( this.key );
		},

		/**
		 * Returns a type-dependent placeholder to be printed in
		 * cases of undefined values.
		 *
		 * @return {string}
		 */
		placeholder: function () {
			let missingType = this.type;
			if ( missingType === Constants.Z_FUNCTION_CALL ) {
				missingType = Constants.Z_FUNCTION;
			}
			if ( Constants.RESOLVER_TYPES.includes( missingType ) ) {
				missingType = this.expectedType;
			}
			const label = missingType ?
				this.getLabelData( missingType ).label :
				this.getLabelData( Constants.Z_OBJECT ).label;
			return this.$i18n( 'wikilambda-zobject-to-string-select-object', label ).text();
		},

		/**
		 * Returns whether the object represented should link to somewhere
		 * or not. Only non-blank terminal strings don't have a link.
		 *
		 * @return {boolean}
		 */
		hasLink: function () {
			return this.isBlank ||
				( this.type !== Constants.Z_STRING && this.type !== Constants.Z_ARGUMENT_REFERENCE );
		},

		/**
		 * Returns whether the object is represented with an icon
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
		 * Returns whether this object is terminal (Z6/String or Z9/Reference).
		 *
		 * @return {boolean}
		 */
		isTerminal: function () {
			return (
				this.type === Constants.Z_ARGUMENT_REFERENCE ||
				this.type === Constants.Z_HTML_FRAGMENT ||
				this.type === Constants.Z_REFERENCE ||
				this.type === Constants.Z_STRING ||
				// If the zobject has a renderer and no error, it's terminal
				( this.rendererZid && !this.rendererError ) ||
				// If the zobject is a wikidata entity, it's terminal
				this.isWikidataType
			);
		},

		/**
		 * Returns whether this object is blank (value is undefined)
		 *
		 * @return {boolean}
		 */
		isBlank: function () {
			return this.value === undefined;
		},

		/**
		 * Returns the array of children to represent in parenthesis.
		 * These are the arguments in case this object is a function call,
		 * or the object keys in case it's a non terminal zobject.
		 * It excludes the key Z1K1/Type.
		 *
		 * @return {Array}
		 */
		childKeys: function () {
			if ( this.isTerminal ) {
				return [];
			}
			if ( this.type === Constants.Z_FUNCTION_CALL ) {
				return this.getZFunctionCallArgumentKeys( this.objectValue );
			}
			return Object.keys( this.objectValue )
				.filter( ( key ) => ( key !== Constants.Z_OBJECT_TYPE ) );
		},

		/**
		 * Returns whether this object has any children to represent
		 *
		 * @return {boolean}
		 */
		hasChildren: function () {
			return this.childKeys.length > 0;
		},

		/**
		 * Return renderer function Zid
		 *
		 * @return {string}
		 */
		rendererZid: function () {
			return this.getRendererZid( this.type );
		}
	} ),
	methods: Object.assign( {}, mapActions( useMainStore, [
		'fetchWikidataEntitiesByType',
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
		},
		/**
		 * Watch the hasChildErrors computed property from the errorMixin
		 * and throw an expand event if a child field of the function call
		 * failed validation.
		 *
		 * @param {boolean} newValue
		 * @param {boolean} oldValue
		 */
		hasChildErrors: function ( newValue, oldValue ) {
			if ( oldValue === false && newValue === true ) {
				this.$emit( 'expand', true );
			}
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
	}

	.ext-wikilambda-app-object-to-string__icon.cdx-icon {
		padding-right: @spacing-25;
		position: relative;
		top: -1px;
		vertical-align: middle;
	}

	.ext-wikilambda-app-object-to-string__icon-label {
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
