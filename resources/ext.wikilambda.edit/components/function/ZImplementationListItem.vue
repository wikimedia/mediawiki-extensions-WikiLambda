<template>
	<!--
		WikiLambda Vue component for ZObject references to ZImplementations in ZLists.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<li class="ext-wikilambda-zlistItem">
		<sd-button v-if="!(viewmode || readonly)"
			class="z-list-item-remove"
			:destructive="true"
			:title="tooltipRemoveListItem"
			@click="removeItem"
		>
			{{ $i18n( 'wikilambda-editor-removeitem' ) }}
		</sd-button>
		<select v-if="!hasReference" @change="selectImplementation">
			<option disabled selected>
				{{ $i18n( "wikilambda-implementation-selector" ) }}
			</option>
			<option
				v-for="zImplementationId in getZImplementations"
				:key="zImplementationId"
				:value="zImplementationId"
			>
				{{ getZkeyLabels[ zImplementationId ] }}
			</option>
		</select>
		<z-reference
			v-else-if="!(viewmode || readonly)"
			:zobject-id="zobjectId"
			:search-type="zType"
			:readonly="true"
		></z-reference>
		<div v-else>
			<h4>
				<a :href="zImplementationLink">
					{{ zImplementationLabel }}
				</a>
			</h4>
			<code-editor
				v-if="!zImplementation ||
					!zImplementation[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_IMPLEMENTATION_BUILT_IN ]"
				:mode="zImplementationCodeLanguage"
				:read-only="true"
				:value="zImplementationCode"
				class="ext-wikilambda-zcode"
			></code-editor>
		</div>
	</li>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	ZListItem = require( '../types/ZListItem.vue' ),
	ZReference = require( '../types/ZReference.vue' ),
	CodeEditor = require( '../base/CodeEditor.vue' ),
	mapGetters = require( 'vuex' ).mapGetters;

module.exports = {
	extends: ZListItem,
	components: {
		'z-reference': ZReference,
		'code-editor': CodeEditor
	},
	computed: $.extend( mapGetters( [
		'getZObjectById',
		'getZImplementations',
		'getZkeyLabels',
		'getZkeys'
	] ),
	{
		zImplementationId: function () {
			return this.findKeyInArray( Constants.Z_REFERENCE_ID, this.zobject ).value;
		},
		hasReference: function () {
			return !!this.zImplementationId;
		},
		zImplementationLabel: function () {
			return this.getZkeyLabels[ this.zImplementationId ];
		},
		zImplementation: function () {
			return this.getZkeys[ this.zImplementationId ];
		},
		zImplementationCodeLanguage: function () {
			if ( !this.zImplementation ) {
				return '';
			}

			if ( !this.zImplementation[ Constants.Z_PERSISTENTOBJECT_VALUE ][
				Constants.Z_IMPLEMENTATION_CODE ]
			) {
				return 'json';
			}

			return this.zImplementation[ Constants.Z_PERSISTENTOBJECT_VALUE ][
				Constants.Z_IMPLEMENTATION_CODE ][
				Constants.Z_CODE_LANGUAGE ][
				Constants.Z_PROGRAMMING_LANGUAGE_CODE ];
		},
		zImplementationCode: function () {
			if ( !this.zImplementation ) {
				return '';
			}

			if ( this.zImplementation[ Constants.Z_PERSISTENTOBJECT_VALUE ][
				Constants.Z_IMPLEMENTATION_COMPOSITION ]
			) {
				return JSON.stringify( this.zImplementation[ Constants.Z_PERSISTENTOBJECT_VALUE ][
					Constants.Z_IMPLEMENTATION_COMPOSITION ], null, 4 );
			}

			return this.zImplementation[ Constants.Z_PERSISTENTOBJECT_VALUE ][
				Constants.Z_IMPLEMENTATION_CODE ][
				Constants.Z_CODE_CODE ];
		},
		zImplementationLink: function () {
			return '/wiki/ZObject:' + this.zImplementationId;
		}
	}
	),
	methods: {
		selectImplementation: function ( event ) {
			this.$store.dispatch( 'injectZObject', {
				zobject: {
					Z1K1: 'Z9',
					Z9K1: event.target.value
				},
				key: 'Z14K1',
				id: this.zobjectId,
				parent: this.getZObjectById( this.zobjectId ).parent
			} );
		}
	}
};
</script>
